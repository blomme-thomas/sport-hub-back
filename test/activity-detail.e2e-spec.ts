import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('Détail d’une activité (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.activity.deleteMany();
  });

  afterEach(async () => {
    await prisma.activity.deleteMany();
    await app.close();
  });

  async function seed(
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const record = await prisma.activity.create({
      data: {
        garminActivityId: '987',
        type: 'running',
        startedAt: new Date('2026-05-01T06:30:00.000Z'),
        durationSeconds: 3600,
        distanceMeters: 10000,
        calories: 650,
        elevationGainMeters: 120,
        averageHeartRate: 145,
        hrTimeInZone1: 600,
        hrTimeInZone2: 1200,
        hrTimeInZone3: 1500,
        hrTimeInZone4: 300,
        rawPayload: { activityId: 987, maxHR: 172, secret: 'charge-brute' },
        ...overrides,
      },
    });
    return record.id;
  }

  it('renvoie les métriques complètes, FC moyenne et maximale et zones, sans la charge brute', async () => {
    const id = await seed();

    const res = await request(app.getHttpServer())
      .get(`/api/activities/${id}`)
      .expect(200);

    expect(res.body).toEqual({
      id,
      garminActivityId: '987',
      type: 'running',
      startedAt: '2026-05-01T06:30:00.000Z',
      durationSeconds: 3600,
      distanceMeters: 10000,
      calories: 650,
      elevationGainMeters: 120,
      averageHeartRate: 145,
      maxHeartRate: 172,
      hrTimeInZone: [600, 1200, 1500, 300, null],
    });
    expect(JSON.stringify(res.body)).not.toContain('charge-brute');
  });

  it('renvoie null pour une métrique que Garmin ne fournit pas, sans erreur', async () => {
    const id = await seed({
      distanceMeters: null,
      calories: null,
      elevationGainMeters: null,
      averageHeartRate: null,
      hrTimeInZone1: null,
      hrTimeInZone2: null,
      hrTimeInZone3: null,
      hrTimeInZone4: null,
      hrTimeInZone5: null,
      rawPayload: {},
    });

    const res = await request(app.getHttpServer())
      .get(`/api/activities/${id}`)
      .expect(200);

    expect(res.body).toMatchObject({
      distanceMeters: null,
      calories: null,
      elevationGainMeters: null,
      averageHeartRate: null,
      maxHeartRate: null,
      hrTimeInZone: [null, null, null, null, null],
    });
  });

  it('renvoie 404 ACTIVITY_NOT_FOUND pour une activité inconnue', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/activities/${UNKNOWN_ID}`)
      .expect(404);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.code).toBe('ACTIVITY_NOT_FOUND');
  });

  it('renvoie 400 VALIDATION_FAILED pour un identifiant qui n’est pas un UUID', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/activities/pas-un-uuid')
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('expose la FC moyenne dans la liste', async () => {
    await seed();

    const res = await request(app.getHttpServer())
      .get('/api/activities')
      .expect(200);

    expect(res.body.items[0].averageHeartRate).toBe(145);
  });
});
