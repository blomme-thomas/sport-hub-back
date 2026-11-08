import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { ANTHROPIC_CLIENT } from './../src/core/anthropic/anthropic-client.provider.js';
import {
  WEEKLY_REVIEW_GENERATOR,
  type IWeeklyReviewGenerator,
  type WeeklyReviewInput,
} from './../src/modules/conseils/domain/ports/outbound/weekly-review.ports.js';

const PROBLEM_JSON = /application\/problem\+json/;
const WEEK = '2026-W45';
const PREVIOUS_WEEK_ACTIVITY = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a31';
const CURRENT_WEEK_ACTIVITY = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a32';

class FakeWeeklyReviewGenerator implements IWeeklyReviewGenerator {
  calls: WeeklyReviewInput[] = [];

  generate(input: WeeklyReviewInput) {
    this.calls.push(input);
    return Promise.resolve({
      suivi: 'Séance réalisée, volume en hausse.',
      pointAttention: 'Allure un peu rapide.',
      conseil: 'Garde la séance de mercredi facile.',
      model: 'claude-sonnet-5-5',
    });
  }
}

describe('Bilans hebdomadaires (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let generator: FakeWeeklyReviewGenerator;

  async function start(options: { unavailable?: boolean } = {}): Promise<void> {
    generator = new FakeWeeklyReviewGenerator();
    const builder = Test.createTestingModule({ imports: [AppModule] });
    if (options.unavailable) {
      builder.overrideProvider(ANTHROPIC_CLIENT).useValue(null);
    } else {
      builder.overrideProvider(WEEKLY_REVIEW_GENERATOR).useValue(generator);
    }
    const moduleFixture = await builder.compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
    await prisma.discipline.create({
      data: {
        typeKey: 'running',
        label: 'Course',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
    await createActivity(PREVIOUS_WEEK_ACTIVITY, '2026-10-28T08:00:00.000Z');
    await createActivity(CURRENT_WEEK_ACTIVITY, '2026-11-04T08:00:00.000Z');
  }

  async function cleanup(): Promise<void> {
    await prisma.weeklyReview.deleteMany();
    await prisma.session.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.discipline.deleteMany();
  }

  async function createActivity(id: string, startedAt: string): Promise<void> {
    await prisma.activity.create({
      data: {
        id,
        garminActivityId: `garmin-${id}`,
        type: 'running',
        startedAt: new Date(startedAt),
        durationSeconds: 2700,
        distanceMeters: 8000,
        rawPayload: {},
      },
    });
  }

  async function planSession(): Promise<void> {
    await http()
      .post('/api/sessions')
      .send({
        date: '2026-11-04',
        disciplineTypeKey: 'running',
        durationMinutes: 45,
      })
      .expect(201);
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

  describe('POST /api/weekly-reviews/:week', () => {
    it('génère le bilan d’une semaine avec séances prévues en un seul appel au modèle', async () => {
      await planSession();

      const res = await http().post(`/api/weekly-reviews/${WEEK}`).expect(201);

      expect(res.body).toMatchObject({
        week: WEEK,
        suivi: 'Séance réalisée, volume en hausse.',
        pointAttention: 'Allure un peu rapide.',
        conseil: 'Garde la séance de mercredi facile.',
        source: 'ia',
        model: 'claude-sonnet-5-5',
      });
      expect(generator.calls).toHaveLength(1);
      expect(generator.calls[0]).toMatchObject({
        week: WEEK,
        planned: [
          {
            date: '2026-11-04',
            disciplineTypeKey: 'running',
            durationMinutes: 45,
          },
        ],
        current: { count: 1, durationSeconds: 2700, distanceMeters: 8000 },
        previous: { count: 1, durationSeconds: 2700, distanceMeters: 8000 },
      });
    });

    it('stocke un bilan générique sans appel au modèle si aucune séance n’est prévue', async () => {
      const res = await http().post(`/api/weekly-reviews/${WEEK}`).expect(201);

      expect(res.body.source).toBe('generique');
      expect(res.body.model).toBeNull();
      expect(generator.calls).toHaveLength(0);
    });

    it('régénère en remplaçant le bilan précédent', async () => {
      await planSession();
      await http().post(`/api/weekly-reviews/${WEEK}`).expect(201);
      generator.calls = [];

      await http().post(`/api/weekly-reviews/${WEEK}`).expect(201);

      expect(generator.calls).toHaveLength(1);
      const stored = await prisma.weeklyReview.count({ where: { week: WEEK } });
      expect(stored).toBe(1);
    });

    it('répond 400 pour une semaine inexistante dans son année', async () => {
      const res = await http()
        .post('/api/weekly-reviews/2025-W53')
        .expect(400)
        .expect('content-type', PROBLEM_JSON);

      expect(res.body.code).toBe('WEEKLY_REVIEW_INVALID_WEEK');
    });

    it('répond 400 pour un format de semaine incorrect', async () => {
      await http().post('/api/weekly-reviews/2026-45').expect(400);
    });

    it('répond 503 sans appel si le modèle n’est pas configuré', async () => {
      await app.close();
      await start({ unavailable: true });
      await planSession();

      const res = await http()
        .post(`/api/weekly-reviews/${WEEK}`)
        .expect(503)
        .expect('content-type', PROBLEM_JSON);

      expect(res.body.code).toBe('WEEKLY_REVIEW_UNAVAILABLE');
    });
  });

  describe('GET /api/weekly-reviews/:week', () => {
    it('lit le bilan stocké sans appel au modèle', async () => {
      await planSession();
      await http().post(`/api/weekly-reviews/${WEEK}`).expect(201);
      generator.calls = [];

      const res = await http().get(`/api/weekly-reviews/${WEEK}`).expect(200);

      expect(res.body).toMatchObject({ week: WEEK, source: 'ia' });
      expect(generator.calls).toHaveLength(0);
    });

    it('répond 404 si aucun bilan n’a été généré pour la semaine', async () => {
      const res = await http()
        .get(`/api/weekly-reviews/${WEEK}`)
        .expect(404)
        .expect('content-type', PROBLEM_JSON);

      expect(res.body.code).toBe('WEEKLY_REVIEW_NOT_FOUND');
    });
  });
});
