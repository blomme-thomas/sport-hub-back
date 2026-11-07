import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const SUMMARY_KEYS = [
  'distanceMeters',
  'durationSeconds',
  'garminActivityId',
  'id',
  'startedAt',
  'type',
];

function seedRows() {
  return [
    {
      garminActivityId: '1',
      type: 'running',
      startedAt: new Date('2026-05-01T06:30:00.000Z'),
      durationSeconds: 3600,
      distanceMeters: 10000,
      rawPayload: { secret: 'charge-brute-a' },
    },
    {
      garminActivityId: '2',
      type: 'cycling',
      startedAt: new Date('2026-05-10T06:30:00.000Z'),
      durationSeconds: 5400.5,
      distanceMeters: 42000,
      rawPayload: { secret: 'charge-brute-b' },
    },
    {
      garminActivityId: '3',
      type: 'running',
      startedAt: new Date('2026-05-20T06:30:00.000Z'),
      durationSeconds: 1800,
      distanceMeters: null,
      rawPayload: { secret: 'charge-brute-c' },
    },
    {
      garminActivityId: '4',
      type: 'running',
      startedAt: new Date('2026-05-31T23:59:59.999Z'),
      durationSeconds: 2400,
      distanceMeters: 7000,
      rawPayload: { secret: 'charge-brute-d' },
    },
  ];
}

describe('Liste des activités (e2e)', () => {
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

  function list(query: Record<string, unknown> = {}) {
    return request(app.getHttpServer()).get('/api/activities').query(query);
  }

  function garminIds(items: { garminActivityId: string }[]): string[] {
    return items.map((item) => item.garminActivityId);
  }

  it('sans_activite_renvoie_une_page_vide_avec_total_zero', async () => {
    const res = await list().expect(200);

    expect(res.body).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
  });

  it('trie_de_la_plus_recente_a_la_plus_ancienne_et_pagine', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const first = await list({ pageSize: 2 }).expect(200);
    const second = await list({ page: 2, pageSize: 2 }).expect(200);

    expect(garminIds(first.body.items)).toEqual(['4', '3']);
    expect(first.body).toMatchObject({ page: 1, pageSize: 2, total: 4 });
    expect(garminIds(second.body.items)).toEqual(['2', '1']);
    expect(second.body).toMatchObject({ page: 2, pageSize: 2, total: 4 });
  });

  it('page_au_dela_de_la_fin_renvoie_des_items_vides_et_le_total', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const res = await list({ page: 9, pageSize: 20 }).expect(200);

    expect(res.body).toEqual({ items: [], page: 9, pageSize: 20, total: 4 });
  });

  it('ne_renvoie_que_le_resume_jamais_la_charge_brute', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const res = await list().expect(200);

    for (const item of res.body.items) {
      expect(Object.keys(item).sort()).toEqual(SUMMARY_KEYS);
    }
    expect(JSON.stringify(res.body)).not.toContain('charge-brute');
    expect(JSON.stringify(res.body)).not.toContain('rawPayload');
    expect(JSON.stringify(res.body)).not.toContain('sourcePayload');
  });

  it('distance_absente_est_renvoyee_a_null', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const res = await list({ type: 'running', pageSize: 2 }).expect(200);

    expect(res.body.items[1]).toMatchObject({
      garminActivityId: '3',
      distanceMeters: null,
    });
  });

  it('filtre_from_seul_inclut_la_borne', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const res = await list({
      from: '2026-05-10T06:30:00.000Z',
    }).expect(200);

    expect(garminIds(res.body.items)).toEqual(['4', '3', '2']);
    expect(res.body.total).toBe(3);
  });

  it('filtre_to_seul_inclut_la_borne', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const res = await list({ to: '2026-05-10T06:30:00.000Z' }).expect(200);

    expect(garminIds(res.body.items)).toEqual(['2', '1']);
    expect(res.body.total).toBe(2);
  });

  it('filtre_to_inclut_une_activite_a_la_milliseconde_pres', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const res = await list({
      from: '2026-05-31T23:59:59.999Z',
      to: '2026-05-31T23:59:59.999Z',
    }).expect(200);

    expect(garminIds(res.body.items)).toEqual(['4']);
  });

  it('filtres_from_et_to_combines_bornent_la_liste', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const res = await list({
      from: '2026-05-05T00:00:00.000Z',
      to: '2026-05-25T00:00:00.000Z',
    }).expect(200);

    expect(garminIds(res.body.items)).toEqual(['3', '2']);
    expect(res.body.total).toBe(2);
  });

  it('filtre_type_correspond_exactement_et_sensible_a_la_casse', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const cycling = await list({ type: 'cycling' }).expect(200);
    const capitalized = await list({ type: 'Running' }).expect(200);

    expect(garminIds(cycling.body.items)).toEqual(['2']);
    expect(cycling.body.total).toBe(1);
    expect(capitalized.body).toMatchObject({ items: [], total: 0 });
  });

  it('filtres_type_et_dates_combines', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const res = await list({
      type: 'running',
      from: '2026-05-15T00:00:00.000Z',
    }).expect(200);

    expect(garminIds(res.body.items)).toEqual(['4', '3']);
    expect(res.body.total).toBe(2);
  });

  it('pagination_et_filtres_restent_coherents_sur_le_total', async () => {
    await prisma.activity.createMany({ data: seedRows() });

    const res = await list({
      type: 'running',
      pageSize: 1,
      page: 2,
    }).expect(200);

    expect(garminIds(res.body.items)).toEqual(['3']);
    expect(res.body.total).toBe(3);
  });

  it.each([
    ['page=0', { page: 0 }, 'page', 'MIN'],
    ['page=abc', { page: 'abc' }, 'page', 'IS_INT'],
    ['pageSize=0', { pageSize: 0 }, 'pageSize', 'MIN'],
    ['pageSize=101', { pageSize: 101 }, 'pageSize', 'MAX'],
    ['from=abc', { from: 'abc' }, 'from', 'IS_ISO8601'],
    ['to=abc', { to: 'abc' }, 'to', 'IS_ISO8601'],
    ['from=2026-W18-1', { from: '2026-W18-1' }, 'from', 'IS_PARSABLE_DATE'],
    ['from=2026-02-30', { from: '2026-02-30' }, 'from', 'IS_ISO8601'],
    ['to=2026-W18-1', { to: '2026-W18-1' }, 'to', 'IS_PARSABLE_DATE'],
    ['page=99999999999', { page: '99999999999' }, 'page', 'MAX'],
    ['page=1000001', { page: 1000001 }, 'page', 'MAX'],
    ['type trop long', { type: 'a'.repeat(65) }, 'type', 'MAX_LENGTH'],
    ['type blanc', { type: '   ' }, 'type', 'IS_NOT_EMPTY'],
    [
      'from>to',
      { from: '2026-05-20T00:00:00.000Z', to: '2026-05-10T00:00:00.000Z' },
      'to',
      'IS_NOT_BEFORE_FROM',
    ],
    ['type vide', { type: '' }, 'type', 'IS_NOT_EMPTY'],
    ['parametre inconnu', { foo: 'bar' }, 'foo', 'PROPERTY_NOT_ALLOWED'],
  ])(
    '%s_repond_400_VALIDATION_FAILED_avec_le_champ_en_erreur',
    async (_label, query, field, code) => {
      const res = await list(query).expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field, code })]),
      );
    },
  );
});
