import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const MODULES_NATATION = [
  {
    type: 'echauffement',
    durationMinutes: 10,
    instruction: 'Nage souple',
  },
  {
    type: 'educatifs',
    durationMinutes: 10,
    instruction: 'Battements de jambes',
  },
  {
    type: 'series',
    durationMinutes: 25,
    instruction: '4 x 100 m',
    targetZones: { pace: { min: 110, max: 120 } },
    perceivedEffort: 7,
  },
  {
    type: 'series',
    durationMinutes: 10,
    instruction: '2 x 50 m',
  },
  {
    type: 'retour_au_calme',
    durationMinutes: 5,
    instruction: 'Brasse lente',
  },
];

const SEANCE_NATATION = {
  date: '2099-05-04',
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
  description: 'Séance de fond',
  modules: MODULES_NATATION,
};

describe('Séances (e2e)', () => {
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
    await prisma.session.deleteMany();
    await prisma.discipline.deleteMany();
    await prisma.discipline.create({
      data: {
        typeKey: 'swimming',
        label: 'Natation',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.discipline.deleteMany();
    await app.close();
  });

  function create(body: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/api/sessions').send(body);
  }

  function list(query: Record<string, unknown> = {}) {
    return request(app.getHttpServer()).get('/api/sessions').query(query);
  }

  function get(id: string) {
    return request(app.getHttpServer()).get(`/api/sessions/${id}`);
  }

  function patch(id: string, body: Record<string, unknown>) {
    return request(app.getHttpServer()).patch(`/api/sessions/${id}`).send(body);
  }

  function replaceModules(id: string, modules: unknown[]) {
    return request(app.getHttpServer())
      .put(`/api/sessions/${id}/modules`)
      .send({ modules });
  }

  function remove(id: string) {
    return request(app.getHttpServer()).delete(`/api/sessions/${id}`);
  }

  async function createNatation(): Promise<string> {
    const res = await create(SEANCE_NATATION).expect(201);
    return res.body.id as string;
  }

  describe('POST /api/sessions', () => {
    it('crée une séance de natation à cinq modules et la récupère avec leur ordre', async () => {
      const res = await create(SEANCE_NATATION).expect(201);

      expect(res.body).toMatchObject({
        date: '2099-05-04',
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
        status: 'planifiee',
        modifiedManually: false,
      });

      const fetched = await get(res.body.id).expect(200);
      expect(
        fetched.body.modules.map((m: { position: number }) => m.position),
      ).toEqual([1, 2, 3, 4, 5]);
      expect(fetched.body.modules.map((m: { type: string }) => m.type)).toEqual(
        MODULES_NATATION.map((m) => m.type),
      );
      expect(fetched.body.modules[2].perceivedEffort).toBe(7);
      expect(fetched.body.modules[0].targetZones).toBeNull();
    });

    it('refuse une discipline absente du référentiel avec un code stable', async () => {
      const res = await create({
        ...SEANCE_NATATION,
        disciplineTypeKey: 'curling',
      }).expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('SESSION_DISCIPLINE_UNKNOWN');
    });

    it('refuse une valeur invalide avec VALIDATION_FAILED', async () => {
      const res = await create({
        ...SEANCE_NATATION,
        durationMinutes: 0,
      }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('GET /api/sessions', () => {
    it('liste les séances de la période, triées par date', async () => {
      await create({ ...SEANCE_NATATION, date: '2099-05-10' }).expect(201);
      await create({ ...SEANCE_NATATION, date: '2099-05-03' }).expect(201);
      await create({ ...SEANCE_NATATION, date: '2099-07-01' }).expect(201);

      const res = await list({ from: '2099-05-01', to: '2099-05-31' }).expect(
        200,
      );

      expect(res.body.items.map((s: { date: string }) => s.date)).toEqual([
        '2099-05-03',
        '2099-05-10',
      ]);
    });
  });

  describe('récurrence hebdomadaire', () => {
    it('crée une séance hebdomadaire et la liste à chaque semaine de la période', async () => {
      const res = await create({
        ...SEANCE_NATATION,
        date: '2099-05-04',
        startTime: '18:00',
        recurrence: 'hebdomadaire',
      }).expect(201);
      expect(res.body.recurrence).toBe('hebdomadaire');

      const occurrences = await list({
        from: '2099-05-01',
        to: '2099-05-31',
      }).expect(200);

      expect(
        occurrences.body.items.map(
          (item: { date: string; recurrence: string }) => [
            item.date,
            item.recurrence,
          ],
        ),
      ).toEqual([
        ['2099-05-04', 'hebdomadaire'],
        ['2099-05-11', 'hebdomadaire'],
        ['2099-05-18', 'hebdomadaire'],
        ['2099-05-25', 'hebdomadaire'],
      ]);
      expect(occurrences.body.items[0]).toMatchObject({
        startTime: '18:00',
        durationMinutes: 60,
        disciplineTypeKey: 'swimming',
        status: 'planifiee',
      });
    });

    it('ne liste une séance non récurrente qu’à sa date', async () => {
      await create({ ...SEANCE_NATATION, date: '2099-05-04' }).expect(201);

      const res = await list({ from: '2099-05-01', to: '2099-05-31' }).expect(
        200,
      );

      expect(res.body.items.map((item: { date: string }) => item.date)).toEqual(
        ['2099-05-04'],
      );
      expect(res.body.items[0].recurrence).toBe('aucune');
    });

    it('modifie toute la série quand on modifie la durée d’une séance hebdomadaire', async () => {
      const id = (
        await create({
          ...SEANCE_NATATION,
          date: '2099-05-04',
          recurrence: 'hebdomadaire',
        }).expect(201)
      ).body.id as string;

      await patch(id, { durationMinutes: 45 }).expect(200);

      const res = await list({ from: '2099-05-01', to: '2099-05-14' }).expect(
        200,
      );
      expect(
        res.body.items.map(
          (item: { durationMinutes: number }) => item.durationMinutes,
        ),
      ).toEqual([45, 45]);
    });

    it('passe une séance de non récurrente à hebdomadaire par modification', async () => {
      const id = await createNatation();

      const res = await patch(id, { recurrence: 'hebdomadaire' }).expect(200);

      expect(res.body.recurrence).toBe('hebdomadaire');
      expect(
        res.body.changeLog.map((entry: { field: string }) => entry.field),
      ).toContain('recurrence');
    });

    it('refuse une récurrence inconnue avec VALIDATION_FAILED', async () => {
      const res = await create({
        ...SEANCE_NATATION,
        recurrence: 'mensuelle',
      }).expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('refuse une période de plus de 366 jours avec 400', async () => {
      await list({ from: '2099-01-01', to: '2100-01-03' }).expect(400);
    });
  });

  describe('occurrences déplacées, annulées et restaurées', () => {
    function move(
      id: string,
      occurrenceDate: string,
      body: Record<string, unknown>,
    ) {
      return request(app.getHttpServer())
        .put(`/api/sessions/${id}/occurrences/${occurrenceDate}`)
        .send(body);
    }

    function cancel(id: string, occurrenceDate: string) {
      return request(app.getHttpServer()).post(
        `/api/sessions/${id}/occurrences/${occurrenceDate}/cancel`,
      );
    }

    function restore(id: string, occurrenceDate: string) {
      return request(app.getHttpServer()).delete(
        `/api/sessions/${id}/occurrences/${occurrenceDate}/exception`,
      );
    }

    async function createWeekly(): Promise<string> {
      const res = await create({
        ...SEANCE_NATATION,
        date: '2099-05-04',
        startTime: '18:00',
        recurrence: 'hebdomadaire',
      }).expect(201);
      return res.body.id as string;
    }

    it('déplace une occurrence : elle quitte sa date et apparaît à la nouvelle, les autres semaines ne bougent pas', async () => {
      const id = await createWeekly();

      await move(id, '2099-05-11', {
        date: '2099-05-12',
        startTime: '07:00',
      }).expect(200);

      const res = await list({ from: '2099-05-01', to: '2099-05-31' }).expect(
        200,
      );
      expect(
        res.body.items.map((item: { date: string; startTime: string }) => [
          item.date,
          item.startTime,
        ]),
      ).toEqual([
        ['2099-05-04', '18:00'],
        ['2099-05-12', '07:00'],
        ['2099-05-18', '18:00'],
        ['2099-05-25', '18:00'],
      ]);
    });

    it('renvoie 404 SESSION_OCCURRENCE_NOT_FOUND pour une date qui n’est pas une occurrence de la série', async () => {
      const id = await createWeekly();

      const res = await move(id, '2099-05-05', { date: '2099-05-06' }).expect(
        404,
      );

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('SESSION_OCCURRENCE_NOT_FOUND');
    });

    it('annule une occurrence, qui reste listée avec le statut annulee, puis la restaure', async () => {
      const id = await createWeekly();

      await cancel(id, '2099-05-11').expect(200);
      const cancelled = await list({
        from: '2099-05-10',
        to: '2099-05-12',
      }).expect(200);
      expect(cancelled.body.items).toEqual([
        expect.objectContaining({ date: '2099-05-11', status: 'annulee' }),
      ]);

      await restore(id, '2099-05-11').expect(204);
      const restored = await list({
        from: '2099-05-10',
        to: '2099-05-12',
      }).expect(200);
      expect(restored.body.items).toEqual([
        expect.objectContaining({ date: '2099-05-11', status: 'planifiee' }),
      ]);
    });

    it('garde les exceptions quand on modifie la série', async () => {
      const id = await createWeekly();
      await move(id, '2099-05-11', { date: '2099-05-12' }).expect(200);

      await patch(id, { durationMinutes: 45 }).expect(200);

      const res = await list({ from: '2099-05-10', to: '2099-05-12' }).expect(
        200,
      );
      expect(res.body.items).toEqual([
        expect.objectContaining({ date: '2099-05-12', durationMinutes: 45 }),
      ]);
    });

    it('fait apparaître une occurrence déplacée depuis hors de la période', async () => {
      const id = await createWeekly();
      await move(id, '2099-05-04', { date: '2099-06-02' }).expect(200);

      const res = await list({ from: '2099-05-31', to: '2099-06-07' }).expect(
        200,
      );

      expect(res.body.items.map((item: { date: string }) => item.date)).toEqual(
        ['2099-06-01', '2099-06-02'],
      );
    });

    it('supprime les exceptions avec la série', async () => {
      const id = await createWeekly();
      await move(id, '2099-05-11', { date: '2099-05-12' }).expect(200);

      await remove(id).expect(204);

      expect(await prisma.sessionOccurrenceException.count()).toBe(0);
    });
  });

  describe('PATCH /api/sessions/:id', () => {
    it('modifie la date, la durée et la description, puis journalise les changements', async () => {
      const id = await createNatation();

      const res = await patch(id, {
        date: '2099-05-06',
        durationMinutes: 45,
        description: 'Séance courte',
      }).expect(200);

      expect(res.body).toMatchObject({
        date: '2099-05-06',
        durationMinutes: 45,
        description: 'Séance courte',
        modifiedManually: true,
      });
      const fields = res.body.changeLog.map(
        (entry: { field: string }) => entry.field,
      );
      expect(fields).toEqual(
        expect.arrayContaining(['date', 'durationMinutes', 'description']),
      );
    });

    it('renvoie 409 SESSION_ALREADY_COMPLETED quand la séance est réalisée', async () => {
      const id = await createNatation();
      await patch(id, { status: 'realisee' }).expect(200);

      const res = await patch(id, { durationMinutes: 30 }).expect(409);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('SESSION_ALREADY_COMPLETED');
    });

    it('renvoie 404 SESSION_NOT_FOUND pour une séance inconnue', async () => {
      const res = await patch(UNKNOWN_ID, { durationMinutes: 30 }).expect(404);

      expect(res.body.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('PUT /api/sessions/:id/modules', () => {
    it('réordonne les modules et renumérote leurs positions', async () => {
      const id = await createNatation();
      const reversed = [...MODULES_NATATION].reverse();

      const res = await replaceModules(id, reversed).expect(200);

      expect(res.body.modules.map((m: { type: string }) => m.type)).toEqual(
        reversed.map((m) => m.type),
      );
      expect(
        res.body.modules.map((m: { position: number }) => m.position),
      ).toEqual([1, 2, 3, 4, 5]);
      expect(res.body.modifiedManually).toBe(true);
    });

    it('renvoie 409 quand la séance est réalisée', async () => {
      const id = await createNatation();
      await patch(id, { status: 'realisee' }).expect(200);

      const res = await replaceModules(id, MODULES_NATATION).expect(409);

      expect(res.body.code).toBe('SESSION_ALREADY_COMPLETED');
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('supprime la séance', async () => {
      const id = await createNatation();

      await remove(id).expect(204);

      const res = await get(id).expect(404);
      expect(res.body.code).toBe('SESSION_NOT_FOUND');
    });
  });
});
