import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const ACTIVITY_A = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a11';
const ACTIVITY_B = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a12';

describe('Rapprochement séances et activités (e2e)', () => {
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
        label: 'Course',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.discipline.deleteMany();
  }

  function http() {
    return request(app.getHttpServer());
  }

  async function createSession(date = '2099-05-04'): Promise<string> {
    const res = await http()
      .post('/api/sessions')
      .send({ date, disciplineTypeKey: 'running', durationMinutes: 45 })
      .expect(201);
    return res.body.id as string;
  }

  async function createActivity(
    id: string,
    startedAt: string,
    type = 'running',
  ): Promise<void> {
    await prisma.activity.create({
      data: {
        id,
        garminActivityId: `garmin-${id}`,
        type,
        startedAt: new Date(startedAt),
        durationSeconds: 2700,
        distanceMeters: 8000,
        rawPayload: {},
      },
    });
  }

  function reconcile(from = '2099-05-01', to = '2099-05-31') {
    return http().post('/api/sessions/reconcile').query({ from, to });
  }

  describe('POST /api/sessions/reconcile', () => {
    it('lie la séance unique à l’activité unique du même jour, en tenant compte du fuseau de Paris', async () => {
      const sessionId = await createSession('2099-05-04');
      await createActivity(ACTIVITY_A, '2099-05-03T23:30:00.000Z');

      const res = await reconcile().expect(200);

      expect(res.body.items).toEqual([{ sessionId, activityId: ACTIVITY_A }]);
      const fetched = await http()
        .get(`/api/sessions/${sessionId}`)
        .expect(200);
      expect(fetched.body.status).toBe('realisee');
      expect(fetched.body.activity).toMatchObject({
        id: ACTIVITY_A,
        origin: 'automatique',
      });
    });

    it('laisse la séance en attente quand deux activités du même jour se disputent', async () => {
      const sessionId = await createSession('2099-05-04');
      await createActivity(ACTIVITY_A, '2099-05-04T08:00:00.000Z');
      await createActivity(ACTIVITY_B, '2099-05-04T18:00:00.000Z');

      const res = await reconcile().expect(200);

      expect(res.body.items).toEqual([]);
      const fetched = await http()
        .get(`/api/sessions/${sessionId}`)
        .expect(200);
      expect(fetched.body.status).toBe('planifiee');
      expect(fetched.body.activity).toBeNull();
    });

    it('refuse une période inversée avec un code stable', async () => {
      const res = await reconcile('2099-05-31', '2099-05-01').expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('SESSION_INVALID');
    });
  });

  describe('PUT /api/sessions/:id/activity', () => {
    it('associe manuellement une activité du même jour et renvoie la séance réalisée', async () => {
      const sessionId = await createSession('2099-05-04');
      await createActivity(ACTIVITY_A, '2099-05-04T08:00:00.000Z');
      await createActivity(ACTIVITY_B, '2099-05-04T18:00:00.000Z');

      const res = await http()
        .put(`/api/sessions/${sessionId}/activity`)
        .send({ activityId: ACTIVITY_B })
        .expect(200);

      expect(res.body.status).toBe('realisee');
      expect(res.body.activity).toMatchObject({
        id: ACTIVITY_B,
        origin: 'manuel',
      });
    });

    it('refuse une activité d’un autre jour avec SESSION_ACTIVITY_NOT_FOUND', async () => {
      const sessionId = await createSession('2099-05-04');
      await createActivity(ACTIVITY_A, '2099-05-06T08:00:00.000Z');

      const res = await http()
        .put(`/api/sessions/${sessionId}/activity`)
        .send({ activityId: ACTIVITY_A })
        .expect(404);

      expect(res.body.code).toBe('SESSION_ACTIVITY_NOT_FOUND');
    });

    it('refuse une activité déjà liée à une autre séance avec SESSION_ACTIVITY_ALREADY_LINKED', async () => {
      const first = await createSession('2099-05-04');
      const second = await createSession('2099-05-04');
      await createActivity(ACTIVITY_A, '2099-05-04T08:00:00.000Z');
      await http()
        .put(`/api/sessions/${first}/activity`)
        .send({ activityId: ACTIVITY_A })
        .expect(200);

      const res = await http()
        .put(`/api/sessions/${second}/activity`)
        .send({ activityId: ACTIVITY_A })
        .expect(409);

      expect(res.body.code).toBe('SESSION_ACTIVITY_ALREADY_LINKED');
    });

    it('renvoie 404 SESSION_NOT_FOUND pour une séance inconnue', async () => {
      const res = await http()
        .put(`/api/sessions/${UNKNOWN_ID}/activity`)
        .send({ activityId: ACTIVITY_A })
        .expect(404);

      expect(res.body.code).toBe('SESSION_NOT_FOUND');
    });

    it('refuse un identifiant d’activité qui n’est pas un UUID', async () => {
      const sessionId = await createSession('2099-05-04');

      const res = await http()
        .put(`/api/sessions/${sessionId}/activity`)
        .send({ activityId: 'pas-un-uuid' })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('DELETE /api/sessions/:id/activity', () => {
    it('dissocie l’activité et conserve le statut de la séance', async () => {
      const sessionId = await createSession('2099-05-04');
      await createActivity(ACTIVITY_A, '2099-05-04T08:00:00.000Z');
      await reconcile().expect(200);

      await http().delete(`/api/sessions/${sessionId}/activity`).expect(204);

      const fetched = await http()
        .get(`/api/sessions/${sessionId}`)
        .expect(200);
      expect(fetched.body.activity).toBeNull();
      expect(fetched.body.status).toBe('realisee');
    });

    it('renvoie 404 SESSION_NOT_FOUND pour une séance inconnue', async () => {
      const res = await http()
        .delete(`/api/sessions/${UNKNOWN_ID}/activity`)
        .expect(404);

      expect(res.body.code).toBe('SESSION_NOT_FOUND');
    });
  });
});
