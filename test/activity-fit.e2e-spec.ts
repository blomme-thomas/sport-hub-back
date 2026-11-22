import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const DOCUMENT = {
  formatVersion: 1,
  session: { sport: 'cycling', avgHeartRate: 165, maxHeartRate: 185 },
  laps: [{ sport: 'cycling', totalCalories: 214 }],
  timeInZone: [{ timeInHrZone: [0, 9.7, 123], hrZoneHighBoundary: [102, 122] }],
  records: [
    [1793000000, 110],
    [1793000001, 112],
  ],
};

describe('Document FIT d’une activité (e2e)', () => {
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

  async function seedActivity(): Promise<string> {
    const record = await prisma.activity.create({
      data: {
        garminActivityId: '987',
        type: 'indoor_cycling',
        startedAt: new Date('2026-11-08T08:44:19.000Z'),
        durationSeconds: 888,
        rawPayload: { activityId: 987 },
      },
    });
    return record.id;
  }

  it('renvoie le document compact enregistré pour l’activité', async () => {
    const id = await seedActivity();
    await prisma.activityFitDocument.create({
      data: { activityId: id, formatVersion: 1, document: DOCUMENT },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/activities/${id}/fit`)
      .expect(200);

    expect(res.body).toEqual(DOCUMENT);
  });

  it('renvoie 404 ACTIVITY_FIT_DATA_NOT_FOUND quand l’activité n’a pas de document', async () => {
    const id = await seedActivity();

    const res = await request(app.getHttpServer())
      .get(`/api/activities/${id}/fit`)
      .expect(404);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.code).toBe('ACTIVITY_FIT_DATA_NOT_FOUND');
  });

  it('renvoie 404 ACTIVITY_NOT_FOUND pour une activité inconnue', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/activities/${UNKNOWN_ID}/fit`)
      .expect(404);

    expect(res.body.code).toBe('ACTIVITY_NOT_FOUND');
  });

  it('supprime le document avec l’activité', async () => {
    const id = await seedActivity();
    await prisma.activityFitDocument.create({
      data: { activityId: id, formatVersion: 1, document: DOCUMENT },
    });

    await prisma.activity.delete({ where: { id } });

    expect(await prisma.activityFitDocument.count()).toBe(0);
  });
});
