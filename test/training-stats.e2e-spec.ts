import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { GarminAccessDeniedError } from './../src/modules/garmin-sync/domain/errors/garmin-access-denied.error.js';
import { GarminUnavailableError } from './../src/modules/garmin-sync/domain/errors/garmin-unavailable.error.js';
import {
  DAILY_CALORIES_PROVIDER,
  type DailyCalories,
  type DailyCaloriesWindow,
  type IDailyCaloriesProvider,
} from './../src/modules/training-stats/domain/ports/outbound/daily-calories.provider.port.js';

const PROBLEM_JSON = /application\/problem\+json/;
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(offset: number): string {
  const now = new Date();
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return new Date(midnight + offset * DAY_MS).toISOString().slice(0, 10);
}

class FakeDailyCaloriesProvider implements IDailyCaloriesProvider {
  readonly values = new Map<string, number | null>();
  readonly windows: DailyCaloriesWindow[] = [];
  failure?: Error;

  findDailyCalories(window: DailyCaloriesWindow): Promise<DailyCalories[]> {
    this.windows.push(window);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    const days: DailyCalories[] = [];
    for (
      let time = window.from.getTime();
      time < window.toExclusive.getTime();
      time += DAY_MS
    ) {
      const date = new Date(time).toISOString().slice(0, 10);
      days.push({ date, calories: this.values.get(date) ?? null });
    }
    return Promise.resolve(days);
  }
}

function activity(
  garminActivityId: string,
  type: string,
  startedAt: string,
  durationSeconds: number,
  distanceMeters: number | null,
) {
  return {
    garminActivityId,
    type,
    startedAt: new Date(startedAt),
    durationSeconds,
    distanceMeters,
    rawPayload: { secret: 'charge-brute' },
  };
}

function weekSeed() {
  return [
    activity('1', 'running', '2026-05-05T06:00:00.000Z', 1800, 5000),
    activity('2', 'running', '2026-05-11T06:00:00.000Z', 3600, 10000),
    activity('3', 'cycling', '2026-05-12T08:00:00.000Z', 5400, 40000),
    activity('4', 'running', '2026-05-18T06:00:00.000Z', 1800, null),
    activity('5', 'running', '2026-05-24T23:59:59.999Z', 2400, 7000),
  ];
}

function monthSeed() {
  return [
    activity('11', 'running', '2026-11-30T12:00:00.000Z', 600, 1000),
    activity('12', 'running', '2026-12-31T23:59:59.999Z', 3600, 10000),
    activity('13', 'cycling', '2026-12-15T08:00:00.000Z', 1800, null),
    activity('14', 'running', '2027-01-01T00:00:00.000Z', 1200, 3000),
  ];
}

describe('Statistiques d’entraînement (e2e)', () => {
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

  function stats(query: Record<string, unknown> = {}) {
    return request(app.getHttpServer()).get('/api/stats').query(query);
  }

  it('renvoie_les_totaux_la_ventilation_la_periode_precedente_et_la_variation_par_semaine', async () => {
    await prisma.activity.createMany({ data: weekSeed() });

    const res = await stats({
      granularity: 'week',
      from: '2026-05-04',
      to: '2026-05-24',
    }).expect(200);

    expect(res.body).toMatchObject({
      granularity: 'week',
      from: '2026-05-04',
      to: '2026-05-24',
      type: null,
    });
    expect(res.body.periods).toHaveLength(3);

    const [first, second, third] = res.body.periods;

    expect(first).toMatchObject({
      start: '2026-05-04T00:00:00.000Z',
      end: '2026-05-10T23:59:59.999Z',
      totals: { count: 1, durationSeconds: 1800, distanceMeters: 5000 },
      byType: [
        {
          type: 'running',
          family: 'running',
          count: 1,
          durationSeconds: 1800,
          distanceMeters: 5000,
        },
      ],
      previous: {
        start: '2026-04-27T00:00:00.000Z',
        end: '2026-05-03T23:59:59.999Z',
        totals: { count: 0, durationSeconds: 0, distanceMeters: 0 },
        byType: [],
      },
      variation: {
        totals: {
          count: { absolute: 1, percent: null },
          durationSeconds: { absolute: 1800, percent: null },
          distanceMeters: { absolute: 5000, percent: null },
        },
        byType: [
          {
            type: 'running',
            count: { absolute: 1, percent: null },
            durationSeconds: { absolute: 1800, percent: null },
            distanceMeters: { absolute: 5000, percent: null },
          },
        ],
      },
    });

    expect(second).toMatchObject({
      start: '2026-05-11T00:00:00.000Z',
      end: '2026-05-17T23:59:59.999Z',
      totals: { count: 2, durationSeconds: 9000, distanceMeters: 50000 },
      byType: [
        {
          type: 'cycling',
          family: 'cycling',
          count: 1,
          durationSeconds: 5400,
          distanceMeters: 40000,
        },
        {
          type: 'running',
          count: 1,
          durationSeconds: 3600,
          distanceMeters: 10000,
        },
      ],
      previous: {
        totals: { count: 1, durationSeconds: 1800, distanceMeters: 5000 },
      },
      variation: {
        totals: {
          count: { absolute: 1, percent: 100 },
          durationSeconds: { absolute: 7200, percent: 400 },
          distanceMeters: { absolute: 45000, percent: 900 },
        },
        byType: [
          {
            type: 'cycling',
            count: { absolute: 1, percent: null },
            durationSeconds: { absolute: 5400, percent: null },
            distanceMeters: { absolute: 40000, percent: null },
          },
          {
            type: 'running',
            count: { absolute: 0, percent: 0 },
            durationSeconds: { absolute: 1800, percent: 100 },
            distanceMeters: { absolute: 5000, percent: 100 },
          },
        ],
      },
    });

    expect(third).toMatchObject({
      start: '2026-05-18T00:00:00.000Z',
      end: '2026-05-24T23:59:59.999Z',
      totals: { count: 2, durationSeconds: 4200, distanceMeters: 7000 },
      byType: [
        {
          type: 'running',
          count: 2,
          durationSeconds: 4200,
          distanceMeters: 7000,
        },
      ],
      previous: {
        start: '2026-05-11T00:00:00.000Z',
        totals: { count: 2, durationSeconds: 9000, distanceMeters: 50000 },
      },
      variation: {
        totals: {
          count: { absolute: 0, percent: 0 },
          durationSeconds: { absolute: -4800, percent: -53.3 },
          distanceMeters: { absolute: -43000, percent: -86 },
        },
      },
    });
  });

  it('renvoie_une_periode_mensuelle_avec_changement_d_annee_et_fin_a_la_milliseconde', async () => {
    await prisma.activity.createMany({ data: monthSeed() });

    const res = await stats({
      granularity: 'month',
      from: '2026-12-01',
      to: '2027-01-31',
    }).expect(200);

    const [december, january] = res.body.periods;

    expect(december).toMatchObject({
      start: '2026-12-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.999Z',
      totals: { count: 2, durationSeconds: 5400, distanceMeters: 10000 },
      previous: {
        start: '2026-11-01T00:00:00.000Z',
        end: '2026-11-30T23:59:59.999Z',
        totals: { count: 1, durationSeconds: 600, distanceMeters: 1000 },
      },
      variation: {
        totals: {
          count: { absolute: 1, percent: 100 },
        },
      },
    });

    expect(january).toMatchObject({
      start: '2027-01-01T00:00:00.000Z',
      end: '2027-01-31T23:59:59.999Z',
      totals: { count: 1, durationSeconds: 1200, distanceMeters: 3000 },
      previous: {
        start: '2026-12-01T00:00:00.000Z',
        end: '2026-12-31T23:59:59.999Z',
        totals: { count: 2, durationSeconds: 5400, distanceMeters: 10000 },
      },
      variation: {
        totals: {
          count: { absolute: -1, percent: -50 },
          durationSeconds: { absolute: -4200, percent: -77.8 },
          distanceMeters: { absolute: -7000, percent: -70 },
        },
      },
    });
  });

  it('periode_sans_activite_renvoie_des_zeros_et_pas_une_erreur', async () => {
    await prisma.activity.createMany({ data: weekSeed() });

    const res = await stats({
      granularity: 'month',
      from: '2026-03-01',
      to: '2026-03-31',
    }).expect(200);

    expect(res.body.periods).toHaveLength(1);
    expect(res.body.periods[0]).toMatchObject({
      totals: { count: 0, durationSeconds: 0, distanceMeters: 0 },
      byType: [],
      previous: { totals: { count: 0 }, byType: [] },
      variation: {
        totals: {
          count: { absolute: 0, percent: null },
        },
        byType: [],
      },
    });
  });

  it('filtre_type_restreint_totaux_ventilation_et_periode_precedente', async () => {
    await prisma.activity.createMany({ data: weekSeed() });

    const res = await stats({
      granularity: 'week',
      from: '2026-05-11',
      to: '2026-05-11',
      type: 'running',
    }).expect(200);

    expect(res.body.type).toBe('running');
    expect(res.body.periods[0]).toMatchObject({
      totals: { count: 1, durationSeconds: 3600, distanceMeters: 10000 },
      byType: [
        {
          type: 'running',
          count: 1,
          durationSeconds: 3600,
          distanceMeters: 10000,
        },
      ],
      previous: {
        totals: { count: 1, durationSeconds: 1800, distanceMeters: 5000 },
      },
    });
  });

  it('filtre_type_sensible_a_la_casse_renvoie_zero_si_aucune_correspondance', async () => {
    await prisma.activity.createMany({ data: weekSeed() });

    const res = await stats({
      granularity: 'week',
      from: '2026-05-11',
      to: '2026-05-11',
      type: 'Running',
    }).expect(200);

    expect(res.body.periods[0].totals).toEqual({
      count: 0,
      durationSeconds: 0,
      distanceMeters: 0,
    });
    expect(res.body.periods[0].byType).toEqual([]);
  });

  it('distance_absente_compte_la_seance_et_sa_duree_sans_distance', async () => {
    await prisma.activity.create({
      data: activity('20', 'strength', '2026-05-12T06:00:00.000Z', 2400, null),
    });

    const res = await stats({
      granularity: 'week',
      from: '2026-05-11',
      to: '2026-05-11',
    }).expect(200);

    expect(res.body.periods[0].totals).toEqual({
      count: 1,
      durationSeconds: 2400,
      distanceMeters: 0,
    });
  });

  it('ne_renvoie_jamais_la_charge_brute', async () => {
    await prisma.activity.createMany({ data: weekSeed() });

    const res = await stats({
      granularity: 'week',
      from: '2026-05-04',
      to: '2026-05-24',
    }).expect(200);

    expect(JSON.stringify(res.body)).not.toContain('charge-brute');
    expect(JSON.stringify(res.body)).not.toContain('rawPayload');
  });

  it.each([
    ['granularity=day', { granularity: 'day' }, 'granularity', 'IS_IN'],
    [
      'granularity absente',
      { from: '2026-05-01', to: '2026-05-31' },
      'granularity',
      'IS_IN',
    ],
    [
      'from absent',
      { granularity: 'week', to: '2026-05-31' },
      'from',
      'IS_CALENDAR_DATE',
    ],
    [
      'from=abc',
      { granularity: 'week', from: 'abc', to: '2026-05-31' },
      'from',
      'IS_CALENDAR_DATE',
    ],
    [
      'from=2026-13-01',
      { granularity: 'month', from: '2026-13-01', to: '2026-12-31' },
      'from',
      'IS_CALENDAR_DATE',
    ],
    [
      'from=2026-02-30',
      { granularity: 'week', from: '2026-02-30', to: '2026-03-05' },
      'from',
      'IS_CALENDAR_DATE',
    ],
    [
      'to absent',
      { granularity: 'week', from: '2026-05-01' },
      'to',
      'IS_CALENDAR_DATE',
    ],
    [
      'to=2026/05/31',
      { granularity: 'week', from: '2026-05-01', to: '2026/05/31' },
      'to',
      'IS_CALENDAR_DATE',
    ],
    [
      'to<from',
      { granularity: 'week', from: '2026-05-31', to: '2026-05-01' },
      'to',
      'IS_NOT_BEFORE_FROM',
    ],
    [
      'type blanc',
      {
        granularity: 'week',
        from: '2026-05-01',
        to: '2026-05-31',
        type: '   ',
      },
      'type',
      'IS_NOT_EMPTY',
    ],
    [
      'type trop long',
      {
        granularity: 'week',
        from: '2026-05-01',
        to: '2026-05-31',
        type: 'a'.repeat(65),
      },
      'type',
      'MAX_LENGTH',
    ],
    [
      'parametre inconnu',
      { granularity: 'week', from: '2026-05-01', to: '2026-05-31', foo: 'bar' },
      'foo',
      'PROPERTY_NOT_ALLOWED',
    ],
  ])(
    '%s_repond_400_VALIDATION_FAILED_avec_le_champ_en_erreur',
    async (_label, query, field, code) => {
      const res = await stats(query).expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field, code })]),
      );
    },
  );

  it('plage_de_plus_de_104_periodes_repond_400_STATS_RANGE_TOO_LARGE', async () => {
    const res = await stats({
      granularity: 'week',
      from: '2026-01-01',
      to: '2028-12-31',
    }).expect(400);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.code).toBe('STATS_RANGE_TOO_LARGE');
  });
});

describe('Tableau de bord des statistiques (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let garmin: FakeDailyCaloriesProvider;

  beforeEach(async () => {
    garmin = new FakeDailyCaloriesProvider();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DAILY_CALORIES_PROVIDER)
      .useValue(garmin)
      .compile();

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

  function dashboard(period: string) {
    return request(app.getHttpServer())
      .get('/api/stats/dashboard')
      .query({ period });
  }

  it('renvoie_les_calories_Garmin_de_chaque_jour_y_compris_sans_seance_et_leur_somme', async () => {
    garmin.values.set(utcDay(-1), 2350);
    garmin.values.set(utcDay(-3), 2100);
    await prisma.activity.create({
      data: {
        ...activity('30', 'running', `${utcDay(-1)}T07:00:00.000Z`, 1800, 5000),
        calories: 500,
      },
    });

    const res = await dashboard('7d').expect(200);

    expect(res.body.daily).toHaveLength(7);
    expect(res.body.totals.calories).toBe(4450);
    expect(
      res.body.daily.find((day: { date: string }) => day.date === utcDay(-1)),
    ).toMatchObject({
      count: 1,
      durationSeconds: 1800,
      calories: 2350,
    });
    expect(
      res.body.daily.find((day: { date: string }) => day.date === utcDay(-3)),
    ).toMatchObject({
      count: 0,
      durationSeconds: 0,
      calories: 2100,
    });
    expect(
      res.body.daily.filter(
        (day: { calories: number | null }) => day.calories === null,
      ),
    ).toHaveLength(5);
  });

  it('renvoie_null_sans_repli_sur_les_activites_quand_Garmin_ne_renseigne_aucun_jour', async () => {
    await prisma.activity.create({
      data: {
        ...activity('31', 'running', `${utcDay(-1)}T07:00:00.000Z`, 1800, 5000),
        calories: 500,
      },
    });

    const res = await dashboard('7d').expect(200);

    expect(res.body.totals.calories).toBeNull();
    expect(
      res.body.daily.every(
        (day: { calories: number | null }) => day.calories === null,
      ),
    ).toBe(true);
  });

  it('renvoie_503_GARMIN_UNAVAILABLE_sans_repli_sur_les_activites', async () => {
    garmin.failure = new GarminUnavailableError();
    await prisma.activity.create({
      data: {
        ...activity('32', 'running', `${utcDay(-1)}T07:00:00.000Z`, 1800, 5000),
        calories: 500,
      },
    });

    const res = await dashboard('7d').expect(503);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({ code: 'GARMIN_UNAVAILABLE' });
    expect(res.body.totals).toBeUndefined();
  });

  it('renvoie_502_GARMIN_ACCESS_DENIED_quand_Garmin_refuse_la_cle', async () => {
    garmin.failure = new GarminAccessDeniedError();

    const res = await dashboard('30d').expect(502);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({ code: 'GARMIN_ACCESS_DENIED' });
  });

  it('renvoie_400_VALIDATION_FAILED_pour_une_periode_inconnue', async () => {
    const res = await dashboard('2y').expect(400);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });
});
