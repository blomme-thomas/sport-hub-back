import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { ANTHROPIC_CLIENT } from './../src/modules/workout-generation/infrastructure/adapters/anthropic-client.provider.js';
import { WORKOUT_CONTEXT_CLOCK } from './../src/modules/workout-generation/infrastructure/adapters/training-stats-context.adapter.js';

const PROBLEM_JSON = /application\/problem\+json/;
const FIXED_NOW = new Date('2026-11-04T12:00:00.000Z');

const VALID_WORKOUT = {
  title: 'Fractionné court',
  sport: 'running',
  summary: 'Échauffement, fractions, retour au calme.',
  totalDurationMinutes: 45,
  steps: [
    { order: 1, label: 'Échauffement', durationMinutes: 10, intensity: 'easy' },
    {
      order: 2,
      label: 'Fractions',
      durationMinutes: 25,
      intensity: 'hard',
      notes: 'Récupération active',
    },
    {
      order: 3,
      label: 'Retour au calme',
      durationMinutes: 10,
      intensity: 'easy',
    },
  ],
};

function reply(text: string, stopReason = 'end_turn') {
  return {
    id: 'msg_e2e',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5-5',
    stop_reason: stopReason,
    content: [{ type: 'text', text }],
  };
}

describe('Génération de séance (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let create: ReturnType<typeof vi.fn>;

  async function buildApp(client: unknown): Promise<void> {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ANTHROPIC_CLIENT)
      .useValue(client)
      .overrideProvider(WORKOUT_CONTEXT_CLOCK)
      .useValue(() => FIXED_NOW)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  }

  function generate(body: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/api/workouts/generate')
      .send(body);
  }

  beforeEach(async () => {
    create = vi.fn().mockResolvedValue(reply(JSON.stringify(VALID_WORKOUT)));
    await buildApp({ messages: { create } });
    await app.get(PrismaService).activity.deleteMany();
  });

  afterEach(async () => {
    await prisma.activity.deleteMany();
    await app.close();
  });

  it('genere_une_seance_200_a_partir_des_activites_recentes_et_transmet_les_volumes', async () => {
    await prisma.activity.create({
      data: {
        garminActivityId: 'gen-1',
        type: 'running',
        startedAt: new Date('2026-10-28T06:00:00.000Z'),
        durationSeconds: 3600,
        distanceMeters: 15432,
        rawPayload: { secret: 'charge-brute' },
      },
    });

    const res = await generate({
      sport: 'course à pied',
      durationMinutes: 45,
    }).expect(200);

    expect(res.body).toMatchObject({
      title: 'Fractionné court',
      sport: 'running',
      totalDurationMinutes: 45,
      basedOn: { weeks: 4, from: '2026-10-05', to: '2026-11-01' },
    });
    expect(res.body.steps).toHaveLength(3);
    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    expect(params.messages[0]?.content).toContain('"distanceMetres": 15432');
    expect(await prisma.activity.count()).toBe(1);
  });

  it('accepte un corps vide et applique quatre semaines par défaut', async () => {
    const res = await generate().expect(200);

    expect(res.body.basedOn.weeks).toBe(4);
  });

  it.each([
    ['trop de semaines', { weeks: 13 }],
    ['zéro semaine', { weeks: 0 }],
    ['durée hors bornes', { durationMinutes: 5 }],
    ['champ inconnu', { foo: 'bar' }],
  ])('refuse %s avec 400 VALIDATION_FAILED', async (_label, body) => {
    const res = await generate(body).expect(400);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(create).not.toHaveBeenCalled();
  });

  it('renvoie 502 WORKOUT_GENERATION_INVALID_OUTPUT sans séance partielle quand la sortie est inexploitable', async () => {
    create.mockResolvedValue(reply('voici ta séance'));

    const res = await generate().expect(502);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      status: 502,
      code: 'WORKOUT_GENERATION_INVALID_OUTPUT',
    });
    expect(res.body).not.toHaveProperty('title', 'Fractionné court');
    expect(JSON.stringify(res.body)).not.toContain('voici ta séance');
  });

  it('renvoie 502 WORKOUT_GENERATION_INVALID_OUTPUT quand la durée ne correspond pas aux étapes', async () => {
    create.mockResolvedValue(
      reply(JSON.stringify({ ...VALID_WORKOUT, totalDurationMinutes: 99 })),
    );

    const res = await generate().expect(502);

    expect(res.body).toMatchObject({
      code: 'WORKOUT_GENERATION_INVALID_OUTPUT',
    });
  });

  describe('sans clé Anthropic', () => {
    beforeEach(async () => {
      await app.close();
      await buildApp(null);
    });

    it('renvoie 503 WORKOUT_GENERATION_UNAVAILABLE en Problem Details sans détail interne', async () => {
      const res = await generate().expect(503);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body).toMatchObject({
        status: 503,
        code: 'WORKOUT_GENERATION_UNAVAILABLE',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/sk-ant|stack/);
      expect(create).not.toHaveBeenCalled();
    });
  });
});
