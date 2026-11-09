import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { PLANNING_AI_GENERATOR } from './../src/modules/planification/domain/ports/outbound/planning-ai-generator.port.js';
import type {
  IPlanningAiGenerator,
  PlanningGenerationInput,
} from './../src/modules/planification/domain/ports/outbound/planning-ai-generator.port.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

class FakeGenerator implements IPlanningAiGenerator {
  calls: PlanningGenerationInput[] = [];

  generate(input: PlanningGenerationInput) {
    this.calls.push(input);
    return Promise.resolve([]);
  }
}

describe('Pauses (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let generator: FakeGenerator;

  async function start(): Promise<void> {
    generator = new FakeGenerator();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PLANNING_AI_GENERATOR)
      .useValue(generator)
      .compile();
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
    await prisma.pause.deleteMany();
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

  async function createPause(body: Record<string, unknown>) {
    return http().post('/api/pauses').send(body).expect(201);
  }

  describe('POST /api/pauses', () => {
    it('crée une pause et renvoie son identifiant', async () => {
      const res = await createPause({
        startDate: '2099-05-10',
        endDate: '2099-05-20',
        reason: 'blessure',
      });

      expect(res.body).toMatchObject({
        startDate: '2099-05-10',
        endDate: '2099-05-20',
        reason: 'blessure',
      });
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('répond 400 si la fin précède le début', async () => {
      const res = await http()
        .post('/api/pauses')
        .send({
          startDate: '2099-05-20',
          endDate: '2099-05-10',
          reason: 'vacances',
        })
        .expect(400)
        .expect('content-type', PROBLEM_JSON);

      expect(res.body.code).toBe('PAUSE_INVALID');
    });

    it('répond 400 pour un motif inconnu', async () => {
      await http()
        .post('/api/pauses')
        .send({
          startDate: '2099-05-10',
          endDate: '2099-05-20',
          reason: 'fete',
        })
        .expect(400);
    });
  });

  describe('GET /api/pauses', () => {
    it('ne renvoie que les pauses qui chevauchent la période', async () => {
      await createPause({
        startDate: '2099-05-10',
        endDate: '2099-05-20',
        reason: 'vacances',
      });
      await createPause({
        startDate: '2099-07-01',
        endDate: '2099-07-10',
        reason: 'autre',
      });

      const res = await http()
        .get('/api/pauses')
        .query({ from: '2099-05-15', to: '2099-05-31' })
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ startDate: '2099-05-10' });
    });
  });

  describe('PATCH /api/pauses/:id', () => {
    it('modifie les champs fournis', async () => {
      const created = await createPause({
        startDate: '2099-05-10',
        endDate: '2099-05-20',
        reason: 'vacances',
      });

      const res = await http()
        .patch(`/api/pauses/${created.body.id}`)
        .send({ endDate: '2099-05-25' })
        .expect(200);

      expect(res.body).toMatchObject({
        startDate: '2099-05-10',
        endDate: '2099-05-25',
      });
    });

    it('répond 404 pour une pause inconnue', async () => {
      const res = await http()
        .patch(`/api/pauses/${UNKNOWN_ID}`)
        .send({ reason: 'autre' })
        .expect(404)
        .expect('content-type', PROBLEM_JSON);

      expect(res.body.code).toBe('PAUSE_NOT_FOUND');
    });
  });

  describe('DELETE /api/pauses/:id', () => {
    it('supprime une pause', async () => {
      const created = await createPause({
        startDate: '2099-05-10',
        endDate: '2099-05-20',
        reason: 'autre',
      });

      await http().delete(`/api/pauses/${created.body.id}`).expect(204);
      const list = await http().get('/api/pauses').expect(200);

      expect(list.body).toEqual([]);
    });
  });

  describe('Planification et pauses', () => {
    async function createFreeSlot(date: string): Promise<void> {
      await http()
        .post('/api/slots')
        .send({ type: 'libre', date, startTime: '18:00', endTime: '20:00' })
        .expect(201);
    }

    it('ne propose aucune séance et n’appelle pas le modèle sur une période entièrement en pause', async () => {
      await createFreeSlot('2099-05-11');
      await createPause({
        startDate: '2099-05-10',
        endDate: '2099-05-12',
        reason: 'blessure',
      });

      const res = await http()
        .post('/api/planning/generate')
        .send({ from: '2099-05-10', to: '2099-05-12' })
        .expect(201);

      expect(res.body.items).toEqual([]);
      expect(generator.calls).toHaveLength(0);
    });

    it('ne transmet pas les créneaux d’une période partiellement en pause', async () => {
      await createFreeSlot('2099-05-11');
      await createFreeSlot('2099-05-13');
      await createPause({
        startDate: '2099-05-11',
        endDate: '2099-05-11',
        reason: 'vacances',
      });

      await http()
        .post('/api/planning/generate')
        .send({ from: '2099-05-10', to: '2099-05-14' })
        .expect(201);

      expect(generator.calls).toHaveLength(1);
      expect(generator.calls[0]?.freeSlots.map((slot) => slot.date)).toEqual([
        '2099-05-13',
      ]);
    });

    it('laisse les séances existantes de la période en pause inchangées', async () => {
      await createFreeSlot('2099-05-11');
      await http()
        .post('/api/sessions')
        .send({
          targetHrZonePercentages: [10, 20, 40, 20, 10],
          date: '2099-05-11',
          disciplineTypeKey: 'swimming',
          durationMinutes: 45,
        })
        .expect(201);
      await createPause({
        startDate: '2099-05-10',
        endDate: '2099-05-12',
        reason: 'vacances',
      });

      const res = await http()
        .get('/api/sessions')
        .query({ from: '2099-05-10', to: '2099-05-12' })
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        date: '2099-05-11',
        durationMinutes: 45,
      });
    });
  });
});
