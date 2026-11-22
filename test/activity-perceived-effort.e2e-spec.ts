import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

describe("Effort perçu Garmin sur le détail d'activité (e2e)", () => {
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

  it('renvoie perceivedEffort depuis workoutRpe du document FIT, et null sans document', async () => {
    const withRpe = await prisma.activity.create({
      data: {
        garminActivityId: 'garmin-rpe-1',
        type: 'running',
        startedAt: new Date('2026-11-10T17:00:00.000Z'),
        durationSeconds: 3000,
        rawPayload: {},
      },
    });
    await prisma.activityFitDocument.create({
      data: {
        activityId: withRpe.id,
        formatVersion: 1,
        document: {
          formatVersion: 1,
          session: { workoutRpe: 60, workoutFeel: 50 },
          laps: [],
          timeInZone: [],
          records: [],
        },
      },
    });
    const withoutDocument = await prisma.activity.create({
      data: {
        garminActivityId: 'garmin-rpe-2',
        type: 'running',
        startedAt: new Date('2026-11-11T17:00:00.000Z'),
        durationSeconds: 3000,
        rawPayload: {},
      },
    });

    const first = await request(app.getHttpServer()).get(
      `/api/activities/${withRpe.id}`,
    );
    const second = await request(app.getHttpServer()).get(
      `/api/activities/${withoutDocument.id}`,
    );

    expect(first.status).toBe(200);
    expect(first.body.perceivedEffort).toBe(6);
    expect(second.status).toBe(200);
    expect(second.body.perceivedEffort).toBeNull();
    expect(first.body.feeling).toBe(50);
    expect(second.body.feeling).toBeNull();
  });
});
