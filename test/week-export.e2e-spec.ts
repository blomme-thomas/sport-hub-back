import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const WEEK = '2026-W46';

const SEANCE = {
  date: '2026-11-10',
  disciplineTypeKey: 'running',
  durationMinutes: 60,
  startTime: '18:00',
  targetDistanceMeters: 10000,
  targetHrZonePercentages: [0, 50, 50, 0, 0],
  modules: [
    {
      type: 'echauffement',
      durationMinutes: 10,
      instruction: 'Footing souple',
    },
    {
      type: 'series',
      durationMinutes: 40,
      instruction: '4 x 1 km',
      perceivedEffort: 7,
    },
  ],
};

describe('Export de semaine (e2e)', () => {
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

  function exportWeek(week: string) {
    return request(app.getHttpServer()).get(`/api/exports/weeks/${week}`);
  }

  it('rejette une semaine mal formée avec un problème 400', async () => {
    const response = await exportWeek('2026-W54');

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body.code).toBe('EXPORT_WEEK_INVALID');
  });

  it('renvoie un fichier valide avec des listes vides pour une semaine sans données', async () => {
    const response = await exportWeek('2026-W10');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      kind: 'bilan-semaine',
      schemaVersion: 1,
      periode: {
        semaine: '2026-W10',
        premierJour: '2026-03-02',
        dernierJour: '2026-03-08',
      },
      seances: [],
      activitesNonPlanifiees: [],
      resume: { seancesPrevues: 0, activitesRealisees: 0 },
    });
    expect(typeof response.body.notesPourLAnalyse).toBe('string');
  });

  it('présente une séance planifiée sans réalisé, avec son plan', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/sessions')
      .send(SEANCE);
    expect(created.status).toBe(201);

    const response = await exportWeek(WEEK);

    expect(response.status).toBe(200);
    expect(response.body.seances).toHaveLength(1);
    expect(response.body.seances[0]).toMatchObject({
      sessionId: created.body.id,
      date: '2026-11-10',
      statut: 'planifiee',
      realise: null,
      atteinte: null,
      plan: {
        durationMinutes: 60,
        targetDistanceMeters: 10000,
        modules: [
          { position: 1, type: 'echauffement', instruction: 'Footing souple' },
          { position: 2, type: 'series', perceivedEffort: 7 },
        ],
      },
    });
    expect(response.body.resume).toMatchObject({
      seancesPrevues: 1,
      seancesRealisees: 0,
      dureePrevueMinutes: 60,
      distancePrevueMeters: 10000,
    });
  });

  it('liste les activités sans séance sans aucun identifiant ni donnée Garmin brute', async () => {
    await prisma.activity.create({
      data: {
        garminActivityId: 'garmin-secret-123',
        type: 'running',
        startedAt: new Date('2026-11-12T07:00:00.000Z'),
        durationSeconds: 3000,
        distanceMeters: 8000,
        averageHeartRate: 142,
        rawPayload: { ownerName: 'Thomas', deviceSerial: 'ABC' },
      },
    });

    const response = await exportWeek(WEEK);

    expect(response.status).toBe(200);
    expect(response.body.activitesNonPlanifiees).toEqual([
      {
        type: 'running',
        startedAt: '2026-11-12T07:00:00.000Z',
        durationSeconds: 3000,
        distanceMeters: 8000,
        averageHeartRate: 142,
      },
    ]);
    expect(response.body.resume).toMatchObject({
      activitesRealisees: 1,
      distanceRealiseeMeters: 8000,
    });
    const body = JSON.stringify(response.body);
    expect(body).not.toContain('garmin-secret-123');
    expect(body).not.toContain('Thomas');
    expect(body).not.toContain('deviceSerial');
    expect(body).not.toContain('rawPayload');
  });
});
