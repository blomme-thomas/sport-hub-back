import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const TRIATHLON_OLYMPIQUE = {
  title: 'Triathlon de Nice',
  type: 'evenement',
  targetDate: '2099-06-20',
  eventFormat: 'olympique',
  targetTimeSeconds: 7200,
};

const COURIR_500_KM = {
  title: 'Courir 500 km',
  type: 'volume',
};

describe('Objectifs (e2e)', () => {
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
    await prisma.goal.deleteMany();
  });

  afterEach(async () => {
    await prisma.goal.deleteMany();
    await app.close();
  });

  function create(body: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/api/goals').send(body);
  }

  function list(query: Record<string, unknown> = {}) {
    return request(app.getHttpServer()).get('/api/goals').query(query);
  }

  function get(id: string) {
    return request(app.getHttpServer()).get(`/api/goals/${id}`);
  }

  function patch(id: string, body: Record<string, unknown>) {
    return request(app.getHttpServer()).patch(`/api/goals/${id}`).send(body);
  }

  function remove(id: string) {
    return request(app.getHttpServer()).delete(`/api/goals/${id}`);
  }

  describe('création, modification et consultation', () => {
    it('crée un événement avec sa date, son format et son temps cible', async () => {
      const res = await create(TRIATHLON_OLYMPIQUE).expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        title: 'Triathlon de Nice',
        type: 'evenement',
        targetDate: '2099-06-20',
        eventFormat: 'olympique',
        targetTimeSeconds: 7200,
      });
    });

    it('modifie le format et le temps cible, et la consultation reflète les nouvelles valeurs', async () => {
      const created = await create(TRIATHLON_OLYMPIQUE).expect(201);

      const patched = await patch(created.body.id, {
        eventFormat: 'half',
        targetTimeSeconds: 21600,
      }).expect(200);
      const fetched = await get(created.body.id).expect(200);

      expect(patched.body).toMatchObject({
        eventFormat: 'half',
        targetTimeSeconds: 21600,
        title: 'Triathlon de Nice',
      });
      expect(fetched.body).toEqual(patched.body);
    });

    it('efface le temps cible et le format quand ils valent null', async () => {
      const created = await create(TRIATHLON_OLYMPIQUE).expect(201);

      const res = await patch(created.body.id, {
        eventFormat: null,
        targetTimeSeconds: null,
      }).expect(200);

      expect(res.body).toMatchObject({
        eventFormat: null,
        targetTimeSeconds: null,
      });
    });

    it('accepte une modification vide sans rien changer', async () => {
      const created = await create(TRIATHLON_OLYMPIQUE).expect(201);

      const res = await patch(created.body.id, {}).expect(200);

      expect(res.body).toEqual(created.body);
    });

    it('renvoie 404 GOAL_NOT_FOUND pour une consultation d’un identifiant inconnu', async () => {
      const res = await get(UNKNOWN_ID).expect(404);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('GOAL_NOT_FOUND');
    });
  });

  describe('liste et filtre à venir', () => {
    it('liste tous les objectifs par date cible croissante, sans date en dernier', async () => {
      await create(COURIR_500_KM).expect(201);
      await create({ ...TRIATHLON_OLYMPIQUE, targetDate: '2099-06-20' }).expect(
        201,
      );
      await create({
        ...TRIATHLON_OLYMPIQUE,
        title: 'Semi',
        targetDate: '2099-01-10',
      }).expect(201);

      const res = await list().expect(200);

      expect(
        res.body.items.map((item: { title: string }) => item.title),
      ).toEqual(['Semi', 'Triathlon de Nice', 'Courir 500 km']);
    });

    it('exclut les objectifs passés et sans date quand upcoming vaut true', async () => {
      await create({
        ...TRIATHLON_OLYMPIQUE,
        title: 'Passé',
        targetDate: '2000-01-01',
      }).expect(201);
      await create(COURIR_500_KM).expect(201);
      await create(TRIATHLON_OLYMPIQUE).expect(201);

      const res = await list({ upcoming: 'true' }).expect(200);

      expect(
        res.body.items.map((item: { title: string }) => item.title),
      ).toEqual(['Triathlon de Nice']);
    });

    it('renvoie tous les objectifs quand upcoming vaut false', async () => {
      await create({
        ...TRIATHLON_OLYMPIQUE,
        title: 'Passé',
        targetDate: '2000-01-01',
      }).expect(201);
      await create(COURIR_500_KM).expect(201);

      const res = await list({ upcoming: 'false' }).expect(200);

      expect(res.body.items).toHaveLength(2);
    });

    it('renvoie 400 VALIDATION_FAILED pour un upcoming qui n’est pas un booléen', async () => {
      const res = await list({ upcoming: 'oui' }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'upcoming' }),
        ]),
      );
    });
  });

  describe('suppression', () => {
    it('supprime l’objectif (204) qui renvoie 404 ensuite', async () => {
      const created = await create(TRIATHLON_OLYMPIQUE).expect(201);

      await remove(created.body.id).expect(204);
      const res = await get(created.body.id).expect(404);

      expect(res.body.code).toBe('GOAL_NOT_FOUND');
    });

    it('renvoie 404 GOAL_NOT_FOUND pour une modification ou une suppression d’un identifiant inconnu', async () => {
      const patched = await patch(UNKNOWN_ID, { title: 'Autre' }).expect(404);
      const deleted = await remove(UNKNOWN_ID).expect(404);

      expect(patched.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(patched.body.code).toBe('GOAL_NOT_FOUND');
      expect(deleted.body.code).toBe('GOAL_NOT_FOUND');
    });

    it('renvoie 400 VALIDATION_FAILED pour un identifiant qui n’est pas un UUID', async () => {
      const res = await remove('abc').expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'id' })]),
      );
    });
  });

  describe('validation', () => {
    it.each([
      ['temps cible négatif', { targetTimeSeconds: -60 }, 'targetTimeSeconds'],
      ['temps cible nul', { targetTimeSeconds: 0 }, 'targetTimeSeconds'],
      [
        'temps cible au-delà de la borne INTEGER',
        { targetTimeSeconds: 3000000000 },
        'targetTimeSeconds',
      ],
      [
        'temps cible non entier',
        { targetTimeSeconds: 90.5 },
        'targetTimeSeconds',
      ],
      ['date inexistante', { targetDate: '2026-02-31' }, 'targetDate'],
      ['date au mauvais format', { targetDate: '20/06/2099' }, 'targetDate'],
      ['format inconnu', { eventFormat: 'marathon' }, 'eventFormat'],
      ['type inconnu', { type: 'course' }, 'type'],
      ['titre absent', { title: undefined }, 'title'],
    ])(
      'renvoie 400 VALIDATION_FAILED avec le champ en erreur pour un %s à la création',
      async (_label, overrides, field) => {
        const res = await create({
          ...TRIATHLON_OLYMPIQUE,
          ...overrides,
        }).expect(400);

        expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
        expect(res.body.code).toBe('VALIDATION_FAILED');
        expect(res.body.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field })]),
        );
      },
    );

    it('renvoie 400 VALIDATION_FAILED pour un temps cible négatif à la modification', async () => {
      const created = await create(TRIATHLON_OLYMPIQUE).expect(201);

      const res = await patch(created.body.id, {
        targetTimeSeconds: -1,
      }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'targetTimeSeconds' }),
        ]),
      );
    });

    it('renvoie 400 GOAL_INVALID quand un format est posé sur un objectif de volume', async () => {
      const res = await create({
        ...COURIR_500_KM,
        eventFormat: 'sprint',
      }).expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('GOAL_INVALID');
    });

    it('renvoie 400 GOAL_INVALID quand la modification passe un événement en volume sans effacer son format', async () => {
      const created = await create(TRIATHLON_OLYMPIQUE).expect(201);

      const res = await patch(created.body.id, { type: 'volume' }).expect(400);

      expect(res.body.code).toBe('GOAL_INVALID');
    });

    it('refuse un champ inconnu', async () => {
      const res = await create({ ...TRIATHLON_OLYMPIQUE, foo: 'bar' }).expect(
        400,
      );

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'foo',
            code: 'PROPERTY_NOT_ALLOWED',
          }),
        ]),
      );
    });
  });
});
