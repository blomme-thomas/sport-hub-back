import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const LIBRE_PONCTUEL = {
  type: 'libre',
  date: '2026-05-04',
  startTime: '09:00',
  endTime: '10:00',
};

const OCCUPE_HEBDOMADAIRE = {
  type: 'occupe',
  date: '2026-05-04',
  startTime: '18:00',
  endTime: '19:30',
  recurrence: 'hebdomadaire',
};

describe('Créneaux (e2e)', () => {
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
    await prisma.slot.deleteMany();
  });

  afterEach(async () => {
    await prisma.slot.deleteMany();
    await app.close();
  });

  function create(body: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/api/slots').send(body);
  }

  function list(query: Record<string, unknown>) {
    return request(app.getHttpServer()).get('/api/slots').query(query);
  }

  function patch(id: string, body: Record<string, unknown>) {
    return request(app.getHttpServer()).patch(`/api/slots/${id}`).send(body);
  }

  function remove(id: string) {
    return request(app.getHttpServer()).delete(`/api/slots/${id}`);
  }

  describe('création et consultation ponctuelle', () => {
    it('crée un créneau libre ponctuel avec les valeurs par défaut', async () => {
      const res = await create(LIBRE_PONCTUEL).expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        type: 'libre',
        date: '2026-05-04',
        startTime: '09:00',
        endTime: '10:00',
        recurrence: 'aucune',
        timeZone: 'Europe/Paris',
      });
    });

    it('retrouve le créneau créé dans la période et pas hors de la période', async () => {
      const created = await create(LIBRE_PONCTUEL).expect(201);

      const inside = await list({
        from: '2026-05-01',
        to: '2026-05-31',
      }).expect(200);
      const outside = await list({
        from: '2026-06-01',
        to: '2026-06-30',
      }).expect(200);

      expect(inside.body).toEqual({
        from: '2026-05-01',
        to: '2026-05-31',
        items: [
          {
            slotId: created.body.id,
            type: 'libre',
            date: '2026-05-04',
            startTime: '09:00',
            endTime: '10:00',
            recurrence: 'aucune',
            timeZone: 'Europe/Paris',
          },
        ],
      });
      expect(outside.body.items).toEqual([]);
    });

    it('accepte un fuseau IANA fourni à la création', async () => {
      const res = await create({
        ...LIBRE_PONCTUEL,
        timeZone: 'America/New_York',
      }).expect(201);

      expect(res.body.timeZone).toBe('America/New_York');
    });
  });

  describe('récurrence hebdomadaire', () => {
    it('renvoie une occurrence par semaine sur quatre semaines', async () => {
      const created = await create(OCCUPE_HEBDOMADAIRE).expect(201);

      const res = await list({ from: '2026-05-01', to: '2026-05-28' }).expect(
        200,
      );

      expect(res.body.items.map((item: { date: string }) => item.date)).toEqual(
        ['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25'],
      );
      for (const item of res.body.items) {
        expect(item).toMatchObject({
          slotId: created.body.id,
          type: 'occupe',
          startTime: '18:00',
          endTime: '19:30',
          recurrence: 'hebdomadaire',
        });
      }
    });

    it('renvoie une liste vide pour une période antérieure à l’ancre', async () => {
      await create(OCCUPE_HEBDOMADAIRE).expect(201);

      const res = await list({ from: '2026-04-01', to: '2026-04-30' }).expect(
        200,
      );

      expect(res.body.items).toEqual([]);
    });

    it('renvoie le 29 février d’une année bissextile', async () => {
      await create({ ...OCCUPE_HEBDOMADAIRE, date: '2028-02-22' }).expect(201);

      const res = await list({ from: '2028-02-28', to: '2028-03-01' }).expect(
        200,
      );

      expect(res.body.items.map((item: { date: string }) => item.date)).toEqual(
        ['2028-02-29'],
      );
    });
  });

  describe('modification et suppression', () => {
    it('reflète dans la liste une modification d’heure', async () => {
      const created = await create(LIBRE_PONCTUEL).expect(201);

      await patch(created.body.id, { endTime: '11:30' }).expect(200);
      const res = await list({ from: '2026-05-04', to: '2026-05-04' }).expect(
        200,
      );

      expect(res.body.items[0]).toMatchObject({ endTime: '11:30' });
    });

    it('reflète le passage d’un créneau hebdomadaire à aucune récurrence', async () => {
      const created = await create(OCCUPE_HEBDOMADAIRE).expect(201);

      const patched = await patch(created.body.id, {
        recurrence: 'aucune',
      }).expect(200);
      const res = await list({ from: '2026-05-01', to: '2026-05-28' }).expect(
        200,
      );

      expect(patched.body.recurrence).toBe('aucune');
      expect(res.body.items.map((item: { date: string }) => item.date)).toEqual(
        ['2026-05-04'],
      );
    });

    it('accepte une modification vide sans rien changer', async () => {
      const created = await create(LIBRE_PONCTUEL).expect(201);

      const res = await patch(created.body.id, {}).expect(200);

      expect(res.body).toEqual(created.body);
    });

    it('renvoie 400 SLOT_END_NOT_AFTER_START quand la modification ramène la fin au début', async () => {
      const created = await create(LIBRE_PONCTUEL).expect(201);

      const res = await patch(created.body.id, { endTime: '09:00' }).expect(
        400,
      );

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('SLOT_END_NOT_AFTER_START');
    });

    it('supprime le créneau (204) qui disparaît ensuite de la liste', async () => {
      const created = await create(OCCUPE_HEBDOMADAIRE).expect(201);

      await remove(created.body.id).expect(204);
      const res = await list({ from: '2026-05-01', to: '2026-05-31' }).expect(
        200,
      );

      expect(res.body.items).toEqual([]);
    });

    it('renvoie 404 SLOT_NOT_FOUND pour une modification ou une suppression d’un identifiant inconnu', async () => {
      const patched = await patch(UNKNOWN_ID, { endTime: '11:00' }).expect(404);
      const deleted = await remove(UNKNOWN_ID).expect(404);

      expect(patched.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(patched.body.code).toBe('SLOT_NOT_FOUND');
      expect(deleted.body.code).toBe('SLOT_NOT_FOUND');
    });

    it('renvoie 400 VALIDATION_FAILED pour un identifiant qui n’est pas un UUID', async () => {
      const res = await remove('abc').expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'id' })]),
      );
    });
  });

  describe('validation de la création', () => {
    it.each([
      ['fin égale au début', { startTime: '09:00', endTime: '09:00' }],
      ['fin antérieure au début', { startTime: '10:00', endTime: '09:00' }],
    ])(
      'renvoie 400 SLOT_END_NOT_AFTER_START pour une %s',
      async (_label, overrides) => {
        const res = await create({ ...LIBRE_PONCTUEL, ...overrides }).expect(
          400,
        );

        expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
        expect(res.body.code).toBe('SLOT_END_NOT_AFTER_START');
      },
    );

    it('renvoie 400 VALIDATION_FAILED avec le champ en erreur pour un type hors valeurs', async () => {
      const res = await create({ ...LIBRE_PONCTUEL, type: 'autre' }).expect(
        400,
      );

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'type' })]),
      );
    });

    it('renvoie 400 VALIDATION_FAILED avec le champ en erreur pour une récurrence hors valeurs', async () => {
      const res = await create({
        ...LIBRE_PONCTUEL,
        recurrence: 'mensuelle',
      }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'recurrence' }),
        ]),
      );
    });

    it('renvoie 400 VALIDATION_FAILED pour un fuseau inconnu', async () => {
      const res = await create({
        ...LIBRE_PONCTUEL,
        timeZone: 'Mars/Olympus',
      }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'timeZone' }),
        ]),
      );
    });

    it('refuse un champ inconnu', async () => {
      const res = await create({ ...LIBRE_PONCTUEL, foo: 'bar' }).expect(400);

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

    it('accepte deux créneaux qui se chevauchent et les renvoie tous deux', async () => {
      const first = await create(LIBRE_PONCTUEL).expect(201);
      const second = await create({
        ...LIBRE_PONCTUEL,
        type: 'occupe',
        startTime: '09:30',
        endTime: '10:30',
      }).expect(201);

      const res = await list({ from: '2026-05-04', to: '2026-05-04' }).expect(
        200,
      );

      expect(
        res.body.items
          .map((item: { slotId: string }) => item.slotId)
          .sort((left: string, right: string) => left.localeCompare(right)),
      ).toEqual(
        [first.body.id, second.body.id].sort((left, right) =>
          left.localeCompare(right),
        ),
      );
    });
  });

  describe('validation de la période', () => {
    it('renvoie 400 SLOT_PERIOD_INVALID quand to précède from', async () => {
      const res = await list({ from: '2026-05-31', to: '2026-05-01' }).expect(
        400,
      );

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('SLOT_PERIOD_INVALID');
    });

    it('renvoie 400 SLOT_PERIOD_TOO_LARGE au-delà de 366 jours', async () => {
      const res = await list({ from: '2026-01-01', to: '2027-01-02' }).expect(
        400,
      );

      expect(res.body.code).toBe('SLOT_PERIOD_TOO_LARGE');
    });

    it('accepte une période de 366 jours', async () => {
      const res = await list({ from: '2026-01-01', to: '2027-01-01' }).expect(
        200,
      );

      expect(res.body.items).toEqual([]);
    });

    it.each([
      ['from absent', { to: '2026-05-31' }, 'from'],
      ['to absent', { from: '2026-05-01' }, 'to'],
      [
        'from au format français',
        { from: '01/05/2026', to: '2026-05-31' },
        'from',
      ],
    ])(
      'renvoie 400 VALIDATION_FAILED quand %s',
      async (_label, query, field) => {
        const res = await list(query).expect(400);

        expect(res.body.code).toBe('VALIDATION_FAILED');
        expect(res.body.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field })]),
        );
      },
    );
  });
});
