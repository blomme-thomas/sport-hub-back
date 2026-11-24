import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;

const SEANCE = {
  date: '2026-11-01',
  startTime: '18:00',
  disciplineTypeKey: 'running',
  durationMinutes: 60,
  targetDistanceMeters: 10000,
  targetHrZonePercentages: [0, 50, 50, 0, 0],
  modules: [
    {
      type: 'echauffement',
      durationMinutes: 10,
      instruction: 'Footing souple',
    },
  ],
};

describe('Export de mois (e2e)', () => {
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
    await prisma.sessionImport.deleteMany();
    await prisma.session.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.discipline.deleteMany();
    await prisma.discipline.create({
      data: {
        typeKey: 'running',
        label: 'Course à pied',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.sessionImport.deleteMany();
    await prisma.session.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.discipline.deleteMany();
    await app.close();
  });

  function exportMonth(month: string) {
    return request(app.getHttpServer()).get(`/api/exports/months/${month}`);
  }

  it('rejette un mois mal formé avec un problème 400', async () => {
    const response = await exportMonth('2026-13');

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body.code).toBe('EXPORT_MONTH_INVALID');
  });

  it('renvoie des listes vides pour un mois sans données', async () => {
    const response = await exportMonth('2026-03');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      kind: 'bilan-mois',
      schemaVersion: 1,
      periode: {
        mois: '2026-03',
        premierJour: '2026-03-01',
        dernierJour: '2026-03-31',
      },
      resume: { seancesPrevues: 0, activitesRealisees: 0 },
    });
    expect(
      response.body.semaines.every(
        (week: { seances: unknown[] }) => week.seances.length === 0,
      ),
    ).toBe(true);
  });

  it('place une séance du 1er novembre dans la semaine partielle de W44, sans reprendre le 31 octobre', async () => {
    await request(app.getHttpServer())
      .post('/api/sessions')
      .send(SEANCE)
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ ...SEANCE, date: '2026-10-31' })
      .expect(201);
    await prisma.activity.create({
      data: {
        garminActivityId: 'garmin-secret-456',
        type: 'running',
        startedAt: new Date('2026-11-12T07:00:00.000Z'),
        durationSeconds: 3000,
        distanceMeters: 8000,
        rawPayload: { ownerName: 'Thomas' },
      },
    });

    const response = await exportMonth('2026-11');

    expect(response.status).toBe(200);
    const w44 = response.body.semaines.find(
      (week: { semaine: string }) => week.semaine === '2026-W44',
    );
    expect(w44).toMatchObject({
      premierJour: '2026-11-01',
      dernierJour: '2026-11-01',
      partielle: true,
    });
    expect(w44.seances).toHaveLength(1);
    expect(w44.seances[0].date).toBe('2026-11-01');

    const allDates = response.body.semaines.flatMap(
      (week: { seances: { date: string }[] }) =>
        week.seances.map((s) => s.date),
    );
    expect(allDates).toEqual(['2026-11-01']);
    expect(response.body.resume).toMatchObject({
      seancesPrevues: 1,
      activitesRealisees: 1,
      distanceRealiseeMeters: 8000,
    });

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('garmin-secret-456');
    expect(body).not.toContain('Thomas');
    expect(body).not.toContain('rawPayload');
  });
});
