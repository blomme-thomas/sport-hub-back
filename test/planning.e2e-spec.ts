import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { ANTHROPIC_CLIENT } from './../src/core/anthropic/anthropic-client.provider.js';
import { PLANNING_AI_GENERATOR } from './../src/modules/planification/domain/ports/outbound/planning-ai-generator.port.js';
import type {
  IPlanningAiGenerator,
  PlanningGenerationInput,
} from './../src/modules/planification/domain/ports/outbound/planning-ai-generator.port.js';
import type { PlannedSession } from './../src/modules/planification/domain/value-objects/planned-session.vo.js';

const PROBLEM_JSON = /application\/problem\+json/;

class FakeGenerator implements IPlanningAiGenerator {
  calls: PlanningGenerationInput[] = [];

  constructor(private planned: PlannedSession[]) {}

  generate(input: PlanningGenerationInput): Promise<PlannedSession[]> {
    this.calls.push(input);
    return Promise.resolve(this.planned);
  }
}

function swim(date: string, durationMinutes = 45): PlannedSession {
  return {
    date,
    disciplineTypeKey: 'swimming',
    durationMinutes,
    modules: [
      {
        type: 'series',
        durationMinutes: 20,
        instruction: '4 x 100 m',
        targetZones: null,
        perceivedEffort: 6,
      },
    ],
  };
}

describe('Planning (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let generator: FakeGenerator;

  async function start(
    options: { planned?: PlannedSession[]; unavailable?: boolean } = {},
  ): Promise<void> {
    generator = new FakeGenerator(options.planned ?? []);
    const builder = Test.createTestingModule({ imports: [AppModule] });
    if (options.unavailable) {
      builder.overrideProvider(ANTHROPIC_CLIENT).useValue(null);
    } else {
      builder.overrideProvider(PLANNING_AI_GENERATOR).useValue(generator);
    }
    const moduleFixture = await builder.compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
    await prisma.discipline.create({
      data: {
        typeKey: 'swimming',
        label: 'Natation',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  }

  async function cleanup(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.slot.deleteMany();
    await prisma.discipline.deleteMany();
  }

  beforeEach(async () => {
    await start();
  });

  afterEach(async () => {
    await cleanup();
    await app.close();
  });

  function http() {
    return request(app.getHttpServer());
  }

  async function createFreeSlot(
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    await http()
      .post('/api/slots')
      .send({ type: 'libre', date, startTime, endTime })
      .expect(201);
  }

  function generate(body: Record<string, unknown>) {
    return http().post('/api/planning/generate').send(body);
  }

  async function sessionsIn(from: string, to: string) {
    const res = await http()
      .get('/api/sessions')
      .query({ from, to })
      .expect(200);
    return res.body.items as {
      id: string;
      date: string;
      durationMinutes: number;
      status: string;
    }[];
  }

  describe('POST /api/planning/generate', () => {
    it('crée les séances proposées dans les créneaux libres, en un seul appel au modèle', async () => {
      await start({ planned: [swim('2099-05-04', 45)] });
      await createFreeSlot('2099-05-04', '18:00', '20:00');

      const res = await generate({
        from: '2099-05-01',
        to: '2099-05-10',
      }).expect(201);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        date: '2099-05-04',
        disciplineTypeKey: 'swimming',
        durationMinutes: 45,
      });
      expect(generator.calls).toHaveLength(1);
      const created = await sessionsIn('2099-05-01', '2099-05-10');
      expect(created).toHaveLength(1);
      expect(created[0].status).toBe('planifiee');
    });

    it('ne touche pas une séance modifiée manuellement de la période et réserve son temps', async () => {
      await start({ planned: [swim('2099-05-04', 60)] });
      await createFreeSlot('2099-05-04', '18:00', '20:00');
      const manual = await http()
        .post('/api/sessions')
        .send({
          date: '2099-05-04',
          disciplineTypeKey: 'swimming',
          durationMinutes: 60,
        })
        .expect(201);
      const before = await http()
        .patch(`/api/sessions/${manual.body.id}`)
        .send({ description: 'Séance choisie' })
        .expect(200);

      const res = await generate({
        from: '2099-05-01',
        to: '2099-05-10',
      }).expect(201);

      expect(res.body.items).toHaveLength(1);
      const after = await http()
        .get(`/api/sessions/${manual.body.id}`)
        .expect(200);
      expect(after.body).toEqual(before.body);
    });

    it('refuse un planning qui dépasse la capacité libre sans créer de séance', async () => {
      await start({ planned: [swim('2099-05-04', 150)] });
      await createFreeSlot('2099-05-04', '18:00', '20:00');

      const res = await generate({
        from: '2099-05-01',
        to: '2099-05-10',
      }).expect(502);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('PLANNING_INVALID_OUTPUT');
      expect(await sessionsIn('2099-05-01', '2099-05-10')).toEqual([]);
    });

    it('refuse une séance placée un jour sans créneau libre', async () => {
      await start({ planned: [swim('2099-05-06', 30)] });
      await createFreeSlot('2099-05-04', '18:00', '20:00');

      const res = await generate({
        from: '2099-05-01',
        to: '2099-05-10',
      }).expect(502);

      expect(res.body.code).toBe('PLANNING_INVALID_OUTPUT');
    });

    it('refuse une période entièrement passée avec un code stable', async () => {
      const res = await generate({
        from: '2020-01-01',
        to: '2020-01-07',
      }).expect(400);

      expect(res.body.code).toBe('PLANNING_PERIOD_INVALID');
      expect(generator.calls).toHaveLength(0);
    });

    it('utilise la date cible d’un objectif comme fin de période', async () => {
      await start({ planned: [] });
      const goal = await http()
        .post('/api/goals')
        .send({
          title: 'Sprint',
          type: 'evenement',
          targetDate: '2099-05-08',
          eventFormat: 'sprint',
          targetTimeSeconds: 5400,
        })
        .expect(201);

      const res = await generate({
        from: '2099-05-01',
        goalId: goal.body.id,
      }).expect(201);

      expect(res.body.to).toBe('2099-05-08');
      expect(res.body.items).toEqual([]);
    });

    it('renvoie 503 sans clé de modèle configurée', async () => {
      await app.close();
      await start({ unavailable: true });
      await createFreeSlot('2099-05-04', '18:00', '20:00');

      const res = await generate({
        from: '2099-05-01',
        to: '2099-05-10',
      }).expect(503);

      expect(res.body.code).toBe('PLANNING_GENERATION_UNAVAILABLE');
    });
  });
});
