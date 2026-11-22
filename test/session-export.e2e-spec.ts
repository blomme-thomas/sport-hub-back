import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const ACTIVITY_ID = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a31';

describe('Export de séance (e2e)', () => {
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
    await cleanup();
    await prisma.discipline.create({
      data: {
        typeKey: 'running',
        label: 'Course à pied',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
    await prisma.activity.create({
      data: {
        id: ACTIVITY_ID,
        garminActivityId: 'garmin-secret-42',
        type: 'running',
        startedAt: new Date('2099-05-04T08:00:00.000Z'),
        durationSeconds: 2700,
        distanceMeters: 8000,
        averageHeartRate: 151,
        rawPayload: { secret: 'donnee-brute' },
      },
    });
  });

  afterEach(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.sessionImport.deleteMany();
    await prisma.session.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.discipline.deleteMany();
  }

  function http() {
    return request(app.getHttpServer());
  }

  async function createSession(): Promise<string> {
    const res = await http()
      .post('/api/sessions')
      .send({
        targetDistanceMeters: 8000,
        targetHrZonePercentages: [10, 20, 40, 20, 10],
        date: '2099-05-04',
        disciplineTypeKey: 'running',
        durationMinutes: 45,
        modules: [
          {
            type: 'series',
            durationMinutes: 45,
            instruction: 'Allure régulière',
          },
        ],
      })
      .expect(201);
    return res.body.id as string;
  }

  describe('GET /api/exports/sessions/:id', () => {
    it('renvoie le plan et le réalisé rapproché au format bilan-seance', async () => {
      const id = await createSession();
      await http()
        .post('/api/sessions/reconcile')
        .query({ from: '2099-05-01', to: '2099-05-10' })
        .expect(200);

      const res = await http().get(`/api/exports/sessions/${id}`).expect(200);

      expect(res.body).toMatchObject({
        format: 'bilan-seance',
        kind: 'seance',
        schemaVersion: 1,
      });
      expect(typeof res.body.notesPourLAnalyse).toBe('string');
      expect(res.body.seance).toMatchObject({
        sessionId: id,
        date: '2099-05-04',
        disciplineTypeKey: 'running',
        plan: {
          durationMinutes: 45,
          targetDistanceMeters: 8000,
          targetHrZonePercentages: [10, 20, 40, 20, 10],
        },
        realise: {
          type: 'running',
          durationSeconds: 2700,
          distanceMeters: 8000,
          averageHeartRate: 151,
        },
      });
      expect(res.body.seance.plan.modules).toHaveLength(1);
      expect(res.body.seance.atteinte).not.toBeNull();
    });

    it('ne renvoie aucune donnée brute ni identifiant Garmin', async () => {
      const id = await createSession();
      await http()
        .post('/api/sessions/reconcile')
        .query({ from: '2099-05-01', to: '2099-05-10' })
        .expect(200);

      const res = await http().get(`/api/exports/sessions/${id}`).expect(200);

      const json = JSON.stringify(res.body);
      expect(json).not.toContain('garmin-secret-42');
      expect(json).not.toContain('donnee-brute');
      expect(json).not.toContain('rawPayload');
      expect(json).not.toContain(ACTIVITY_ID);
    });

    it('renvoie un réalisé et une atteinte vides, sans erreur, pour une séance sans activité rapprochée', async () => {
      const id = await createSession();

      const res = await http().get(`/api/exports/sessions/${id}`).expect(200);

      expect(res.body.seance.realise).toBeNull();
      expect(res.body.seance.atteinte).toBeNull();
      expect(res.body.seance.statut).toBe('planifiee');
    });

    it('renvoie 404 SESSION_NOT_FOUND au format Problem Details pour une séance inconnue', async () => {
      const res = await http()
        .get(`/api/exports/sessions/${UNKNOWN_ID}`)
        .expect(404);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('SESSION_NOT_FOUND');
    });

    it('renvoie 400 au format Problem Details pour un identifiant qui n’est pas un UUID', async () => {
      const res = await http()
        .get('/api/exports/sessions/pas-un-uuid')
        .expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'id' })]),
      );
    });
  });
});
