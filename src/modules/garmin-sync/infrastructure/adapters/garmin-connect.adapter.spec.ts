import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { HttpClientModule } from '../../../../core/http/http-client.module.js';
import { HttpClientService } from '../../../../core/http/http-client.service.js';
import {
  DEFAULT_HTTP_CLIENT_OPTIONS,
  HTTP_CLIENT_DEFAULTS,
} from '../../../../core/http/http-client.types.js';
import { GarminAccessDeniedError } from '../../domain/errors/garmin-access-denied.error.js';
import { GarminUnavailableError } from '../../domain/errors/garmin-unavailable.error.js';
import { GarminConnectAdapter } from './garmin-connect.adapter.js';
import { GarminPersonalApiTokenProvider } from './garmin-personal-api-token.provider.js';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const TOKEN_PATH =
  '/personalapitoken-service/personal-api/personal-api-key/token';
const ACTIVITIES_PATH = '/activitylist-service/activities/search/activities';
const DAILY_SUMMARIES_PATH = '/usersummary-service/v2/dailysummaries';
const API_KEY = 'cle-secrete-garmin-12345';

const FAST_DEFAULTS = {
  ...DEFAULT_HTTP_CLIENT_OPTIONS,
  timeoutMs: 2_000,
  maxRetries: 0,
  backoffBaseMs: 5,
  backoffMaxMs: 20,
};

function reply(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function encode(part: unknown): string {
  return Buffer.from(JSON.stringify(part)).toString('base64url');
}

function fakeJwt(n: number): string {
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ jti: `jeton-${n}`, exp: 4_102_444_800 })}.signature`;
}

function garminItem(id: number, overrides: Record<string, unknown> = {}) {
  return {
    activityId: id,
    activityName: 'Sortie matinale',
    activityType: { typeKey: 'running', typeId: 1 },
    startTimeGMT: '2026-05-01 06:30:00',
    duration: 3600.5,
    distance: 10250.75,
    averageHR: 150,
    ...overrides,
  };
}

function dailySummaryItem(calendarDate: string, burnedTotal: number) {
  return {
    calendarDate,
    calories: { burnedResting: 1800, burnedActive: 550, burnedTotal },
  };
}

function daysBetween(from: string, to: string): number {
  return (
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      (24 * 60 * 60 * 1000) +
    1
  );
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (e: unknown) => e,
  );
}

describe('GarminConnectAdapter', () => {
  let server: Server;
  let baseUrl: string;
  let tokenHandler: Handler;
  let activitiesHandler: Handler;
  let tokenHits: IncomingMessage[];
  let activityHits: IncomingMessage[];
  let dailySummaryHits: IncomingMessage[];
  let dailySummariesHandler: Handler;
  let moduleRef: TestingModule;
  let http: HttpClientService;
  let logged: string[];

  function adapter(key: string | null = API_KEY) {
    const config = {
      personalApiKey: key ?? undefined,
      personalApiBaseUrl: baseUrl,
      syncCronEnabled: false,
      syncCronExpression: '0 */3 * * *',
    };
    return new GarminConnectAdapter(
      http,
      new GarminPersonalApiTokenProvider(http, config),
      config,
    );
  }

  function query(req: IncomingMessage): URLSearchParams {
    return new URL(req.url ?? '', 'http://localhost').searchParams;
  }

  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = (req.url ?? '').split('?')[0];
      if (path === TOKEN_PATH) {
        tokenHits.push(req);
        tokenHandler(req, res);
        return;
      }
      if (path === ACTIVITIES_PATH) {
        activityHits.push(req);
        activitiesHandler(req, res);
        return;
      }
      if (path === DAILY_SUMMARIES_PATH) {
        dailySummaryHits.push(req);
        dailySummariesHandler(req, res);
        return;
      }
      reply(res, 404, {});
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    tokenHits = [];
    activityHits = [];
    dailySummaryHits = [];
    let count = 0;
    tokenHandler = (_req, res) => {
      count += 1;
      reply(res, 200, fakeJwt(count));
    };
    activitiesHandler = (_req, res) => reply(res, 200, []);
    dailySummariesHandler = (_req, res) => reply(res, 200, { data: [] });
    logged = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation(
        (...args: unknown[]) => {
          logged.push(args.map((a) => String(a)).join(' '));
        },
      );
    }
    moduleRef = await Test.createTestingModule({ imports: [HttpClientModule] })
      .overrideProvider(HTTP_CLIENT_DEFAULTS)
      .useValue(FAST_DEFAULTS)
      .compile();
    http = moduleRef.get(HttpClientService);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await moduleRef.close();
  });

  describe('mapping vers le Domain', () => {
    it('traduit une activité Garmin en Activity du Domain', async () => {
      activitiesHandler = (_req, res) =>
        reply(res, 200, [garminItem(12345678901)]);

      const [activity] = await adapter().fetchActivitiesSince(null);

      expect(activity.garminActivityId.toString()).toBe('12345678901');
      expect(activity.type).toBe('running');
      expect(activity.startedAt.toISOString()).toBe('2026-05-01T06:30:00.000Z');
      expect(activity.durationSeconds).toBe(3600.5);
      expect(activity.distanceMeters).toBe(10250.75);
    });

    it("conserve l'objet Garmin entier comme payload source", async () => {
      const item = garminItem(7);
      activitiesHandler = (_req, res) => reply(res, 200, [item]);

      const [activity] = await adapter().fetchActivitiesSince(null);

      expect(activity.sourcePayload).toEqual(item);
    });

    it('interprète startTimeGMT en UTC', async () => {
      activitiesHandler = (_req, res) =>
        reply(res, 200, [
          garminItem(1, { startTimeGMT: '2026-12-31 23:59:59' }),
        ]);

      const [activity] = await adapter().fetchActivitiesSince(null);

      expect(activity.startedAt.toISOString()).toBe('2026-12-31T23:59:59.000Z');
    });

    it('accepte un élément qui ne porte que les champs obligatoires de SummarizedActivityDTO', async () => {
      activitiesHandler = (_req, res) =>
        reply(res, 200, [
          {
            activityId: 42,
            activityType: { typeKey: 'hiking' },
            startTimeGMT: '2026-05-02 08:00:00',
            duration: 1200,
          },
        ]);

      const [activity] = await adapter().fetchActivitiesSince(null);

      expect(activity.garminActivityId.toString()).toBe('42');
      expect(activity.type).toBe('hiking');
      expect(activity.startedAt.toISOString()).toBe('2026-05-02T08:00:00.000Z');
      expect(activity.durationSeconds).toBe(1200);
      expect(activity.distanceMeters).toBeNull();
    });

    it('mappe une distance absente à null', async () => {
      const { distance: _distance, ...withoutDistance } = garminItem(1);
      activitiesHandler = (_req, res) => reply(res, 200, [withoutDistance]);

      const [activity] = await adapter().fetchActivitiesSince(null);

      expect(activity.distanceMeters).toBeNull();
    });

    it('mappe une distance nulle à null', async () => {
      activitiesHandler = (_req, res) =>
        reply(res, 200, [garminItem(1, { distance: null })]);

      const [activity] = await adapter().fetchActivitiesSince(null);

      expect(activity.distanceMeters).toBeNull();
    });

    it('renvoie une liste vide quand Garmin ne renvoie aucune activité', async () => {
      await expect(adapter().fetchActivitiesSince(null)).resolves.toEqual([]);
    });
  });

  describe('requête', () => {
    it("envoie le jeton d'accès en Bearer", async () => {
      await adapter().fetchActivitiesSince(null);

      expect(activityHits[0].method).toBe('GET');
      expect(activityHits[0].headers.authorization).toBe(
        `Bearer ${fakeJwt(1)}`,
      );
    });

    it("n'envoie la clé Garmin ni dans l'URL ni dans les en-têtes d'activités", async () => {
      await adapter().fetchActivitiesSince(null);

      expect(activityHits[0].url).not.toContain(API_KEY);
      expect(JSON.stringify(activityHits[0].headers)).not.toContain(API_KEY);
    });

    it('filtre sur la date de début quand elle est fournie', async () => {
      await adapter().fetchActivitiesSince(
        new Date('2026-01-10T12:00:00.000Z'),
      );

      expect(query(activityHits[0]).get('startDate')).toBe('2026-01-09');
    });

    it('exclut les activités enfants côté Garmin', async () => {
      await adapter().fetchActivitiesSince(null);

      expect(query(activityHits[0]).get('excludeChildren')).toBe('true');
    });

    it('recule la date de début d un jour pour absorber le décalage entre heure locale et UTC', async () => {
      await adapter().fetchActivitiesSince(
        new Date('2026-03-01T00:30:00.000+02:00'),
      );

      expect(query(activityHits[0]).get('startDate')).toBe('2026-02-27');
    });

    it("remonte environ 365 jours en arrière quand aucune borne n'est fournie", async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));

      await adapter().fetchActivitiesSince(null);

      expect(query(activityHits[0]).get('startDate')).toMatch(/^2025-06-15/);
    });

    it('demande la première page à partir du décalage 0', async () => {
      await adapter().fetchActivitiesSince(null);

      expect(query(activityHits[0]).get('start')).toBe('0');
    });

    it('demande des pages de 99 activités, valeur documentée par la spécification', async () => {
      await adapter().fetchActivitiesSince(null);

      expect(query(activityHits[0]).get('limit')).toBe('99');
    });
  });

  describe('pagination', () => {
    function serve(total: number): void {
      activitiesHandler = (req, res) => {
        const q = query(req);
        const start = Number(q.get('start'));
        const limit = Number(q.get('limit'));
        const page = Array.from({ length: total }, (_v, i) =>
          garminItem(i + 1),
        ).slice(start, start + limit);
        reply(res, 200, page);
      };
    }

    it('parcourt toutes les pages jusqu à la dernière', async () => {
      serve(250);

      const activities = await adapter().fetchActivitiesSince(null);

      expect(activities).toHaveLength(250);
      expect(
        new Set(activities.map((a) => a.garminActivityId.toString())).size,
      ).toBe(250);
    });

    it("avance le décalage d'une page à l'autre", async () => {
      serve(250);

      await adapter().fetchActivitiesSince(null);

      const starts = activityHits.map((h) => Number(query(h).get('start')));
      expect(starts[0]).toBe(0);
      expect(starts[1]).toBeGreaterThan(0);
      expect(new Set(starts).size).toBe(starts.length);
    });

    it('borne le nombre de pages lorsque Garmin renvoie indéfiniment des pages pleines', async () => {
      activitiesHandler = (req, res) => {
        const limit = Number(query(req).get('limit'));
        const start = Number(query(req).get('start'));
        reply(
          res,
          200,
          Array.from({ length: limit }, (_v, i) => garminItem(start + i + 1)),
        );
      };

      await adapter().fetchActivitiesSince(null);

      expect(activityHits.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('éléments invalides', () => {
    it.each([
      ['sans activityId', { activityId: undefined }],
      ['avec un type absent', { activityType: undefined }],
      ['avec un type sans typeKey', { activityType: {} }],
      ['avec une date illisible', { startTimeGMT: 'hier' }],
      ['sans date', { startTimeGMT: undefined }],
      ['avec une durée négative', { duration: -5 }],
      ['avec une durée textuelle', { duration: 'longue' }],
      ['avec une distance négative', { distance: -1 }],
      ['avec un identifiant en chaîne', { activityId: '2' }],
      ['avec un identifiant au-delà de 2^53', { activityId: 2 ** 53 }],
      [
        'avec une date à fraction de seconde',
        { startTimeGMT: '2026-05-01 06:30:00.0' },
      ],
    ])(
      'saute une activité %s sans faire échouer la synchronisation',
      async (_label, overrides) => {
        activitiesHandler = (_req, res) =>
          reply(res, 200, [
            garminItem(1),
            garminItem(2, overrides),
            garminItem(3),
          ]);

        const activities = await adapter().fetchActivitiesSince(null);

        expect(
          activities.map((a) => a.garminActivityId.toString()).sort(),
        ).toEqual(['1', '3']);
      },
    );

    it('saute un élément qui n est pas un objet', async () => {
      activitiesHandler = (_req, res) =>
        reply(res, 200, [garminItem(1), 'texte', null, 42]);

      const activities = await adapter().fetchActivitiesSince(null);

      expect(activities).toHaveLength(1);
    });

    it("journalise l'élément ignoré avec son identifiant seulement", async () => {
      activitiesHandler = (_req, res) =>
        reply(res, 200, [
          garminItem(987654, {
            activityName: 'Nom privé du séjour',
            duration: -5,
          }),
        ]);

      await adapter().fetchActivitiesSince(null);

      const output = logged.join('\n');
      expect(output).toContain('987654');
      expect(output).not.toContain('Nom privé du séjour');
    });

    it("journalise sans le payload un élément dont l'identifiant est mal typé", async () => {
      activitiesHandler = (_req, res) =>
        reply(res, 200, [
          garminItem(1, {
            activityId: 'Nom privé du séjour',
            duration: 'abc',
          }),
        ]);

      const activities = await adapter().fetchActivitiesSince(null);

      const output = logged.join('\n');
      expect(activities).toHaveLength(0);
      expect(output).toContain('inconnu');
      expect(output).not.toContain('Nom privé du séjour');
    });
  });

  describe('enveloppe invalide', () => {
    it.each([
      ['un objet', { activities: [] }],
      ['un corps non JSON', 'pas du json'],
      ['null', 'null'],
      ['un nombre', '42'],
    ])('lève GarminUnavailableError sur %s', async (_label, body) => {
      activitiesHandler = (_req, res) => reply(res, 200, body);

      await expect(adapter().fetchActivitiesSince(null)).rejects.toBeInstanceOf(
        GarminUnavailableError,
      );
    });
  });

  describe('clé et jeton', () => {
    it('lève GarminAccessDeniedError sans appel HTTP quand la clé est absente', async () => {
      const error = await rejection(adapter(null).fetchActivitiesSince(null));

      expect(error).toBeInstanceOf(GarminAccessDeniedError);
      expect(tokenHits).toHaveLength(0);
      expect(activityHits).toHaveLength(0);
    });

    it('lève GarminAccessDeniedError quand Garmin refuse la clé', async () => {
      tokenHandler = (_req, res) => reply(res, 401, {});

      await expect(adapter().fetchActivitiesSince(null)).rejects.toBeInstanceOf(
        GarminAccessDeniedError,
      );
      expect(activityHits).toHaveLength(0);
    });

    it("lève GarminUnavailableError quand la réponse d'authentification est inattendue", async () => {
      tokenHandler = (_req, res) => reply(res, 200, { autre: true });

      await expect(adapter().fetchActivitiesSince(null)).rejects.toBeInstanceOf(
        GarminUnavailableError,
      );
    });

    it("lève GarminUnavailableError quand le service d'authentification est en panne", async () => {
      tokenHandler = (_req, res) => reply(res, 500, {});

      await expect(adapter().fetchActivitiesSince(null)).rejects.toBeInstanceOf(
        GarminUnavailableError,
      );
    });
  });

  describe('rejet du jeton par Garmin', () => {
    it.each([401, 403])(
      'invalide le jeton et réessaie une fois après un %i puis réussit',
      async (status) => {
        let calls = 0;
        activitiesHandler = (_req, res) => {
          calls += 1;
          if (calls === 1) {
            reply(res, status, {});
            return;
          }
          reply(res, 200, [garminItem(1)]);
        };

        const activities = await adapter().fetchActivitiesSince(null);

        expect(activities).toHaveLength(1);
        expect(tokenHits).toHaveLength(2);
        expect(activityHits).toHaveLength(2);
        expect(activityHits[1].headers.authorization).toBe(
          `Bearer ${fakeJwt(2)}`,
        );
      },
    );

    it.each([401, 403])(
      'lève GarminAccessDeniedError après un seul nouvel essai quand le %i persiste',
      async (status) => {
        activitiesHandler = (_req, res) => reply(res, status, {});

        await expect(
          adapter().fetchActivitiesSince(null),
        ).rejects.toBeInstanceOf(GarminAccessDeniedError);
        expect(activityHits).toHaveLength(2);
        expect(tokenHits).toHaveLength(2);
      },
    );
  });

  describe('panne de Garmin', () => {
    it.each([500, 502, 503])(
      'lève GarminUnavailableError sur un statut %i sans réessayer',
      async (status) => {
        activitiesHandler = (_req, res) => reply(res, status, {});

        await expect(
          adapter().fetchActivitiesSince(null),
        ).rejects.toBeInstanceOf(GarminUnavailableError);
        expect(activityHits).toHaveLength(1);
      },
    );

    it('lève GarminUnavailableError sur un timeout', async () => {
      activitiesHandler = () => {};
      const slowModule = await Test.createTestingModule({
        imports: [HttpClientModule],
      })
        .overrideProvider(HTTP_CLIENT_DEFAULTS)
        .useValue({ ...FAST_DEFAULTS, timeoutMs: 50 })
        .compile();
      const slowHttp = slowModule.get(HttpClientService);
      const config = {
        personalApiKey: API_KEY,
        personalApiBaseUrl: baseUrl,
        syncCronEnabled: false,
        syncCronExpression: '0 */3 * * *',
      };
      const slow = new GarminConnectAdapter(
        slowHttp,
        new GarminPersonalApiTokenProvider(slowHttp, config),
        config,
      );

      const error = await rejection(slow.fetchActivitiesSince(null));
      await slowModule.close();

      expect(error).toBeInstanceOf(GarminUnavailableError);
    });

    it('lève GarminUnavailableError quand le serveur est injoignable', async () => {
      const config = {
        personalApiKey: API_KEY,
        personalApiBaseUrl: 'http://127.0.0.1:1',
        syncCronEnabled: false,
        syncCronExpression: '0 */3 * * *',
      };
      const unreachable = new GarminConnectAdapter(
        http,
        new GarminPersonalApiTokenProvider(http, config),
        config,
      );

      await expect(
        unreachable.fetchActivitiesSince(null),
      ).rejects.toBeInstanceOf(GarminUnavailableError);
    });
  });

  describe('calories journalières (résumé quotidien)', () => {
    const RANGE = { from: '2026-11-01', to: '2026-11-03' };
    const YEAR = { from: '2026-01-01', to: '2026-12-31' };

    it('interroge le résumé quotidien avec la plage incluse en startDate et endDate', async () => {
      await adapter().fetchDailyCalories(RANGE);

      expect(dailySummaryHits).toHaveLength(1);
      expect(dailySummaryHits[0].method).toBe('GET');
      expect(query(dailySummaryHits[0]).get('startDate')).toBe('2026-11-01');
      expect(query(dailySummaryHits[0]).get('endDate')).toBe('2026-11-03');
    });

    it('envoie le jeton d accès en Bearer et jamais la clé dans l URL', async () => {
      await adapter().fetchDailyCalories(RANGE);

      expect(dailySummaryHits[0].headers.authorization).toBe(
        `Bearer ${fakeJwt(1)}`,
      );
      expect(dailySummaryHits[0].url).not.toContain(API_KEY);
    });

    it('renvoie un jour par date de la plage, avec burnedTotal pour le jour renseigné', async () => {
      dailySummariesHandler = (_req, res) =>
        reply(res, 200, {
          data: [dailySummaryItem('2026-11-02', 2350)],
        });

      await expect(adapter().fetchDailyCalories(RANGE)).resolves.toEqual([
        { date: '2026-11-01', calories: null },
        { date: '2026-11-02', calories: 2350 },
        { date: '2026-11-03', calories: null },
      ]);
    });

    it('couvre une année en tranches de 90 jours au plus, contiguës, sans trou ni chevauchement', async () => {
      const requested: { startDate: string; endDate: string }[] = [];
      dailySummariesHandler = (req, res) => {
        requested.push({
          startDate: query(req).get('startDate') ?? '',
          endDate: query(req).get('endDate') ?? '',
        });
        reply(res, 200, { data: [] });
      };

      const days = await adapter().fetchDailyCalories(YEAR);

      expect(days).toHaveLength(365);
      expect(requested[0]?.startDate).toBe(YEAR.from);
      expect(requested[requested.length - 1]?.endDate).toBe(YEAR.to);
      for (const [index, chunk] of requested.entries()) {
        expect(daysBetween(chunk.startDate, chunk.endDate)).toBeLessThanOrEqual(
          90,
        );
        if (index > 0) {
          const previousEnd = Date.parse(
            `${requested[index - 1]?.endDate}T00:00:00.000Z`,
          );
          const start = Date.parse(`${chunk.startDate}T00:00:00.000Z`);
          expect(start - previousEnd).toBe(24 * 60 * 60 * 1000);
        }
      }
    });

    it('renvoie les jours sans donnée à null quand une tranche répond 204', async () => {
      dailySummariesHandler = (_req, res) => reply(res, 204, '');

      const days = await adapter().fetchDailyCalories(RANGE);

      expect(days).toHaveLength(3);
      for (const day of days) {
        expect(day.calories).toBeNull();
      }
    });

    it('lève GarminUnavailableError quand une tranche échoue et n appelle pas les tranches suivantes', async () => {
      let calls = 0;
      dailySummariesHandler = (_req, res) => {
        calls += 1;
        if (calls === 1) {
          reply(res, 200, { data: [] });
          return;
        }
        reply(res, 500, {});
      };

      await expect(adapter().fetchDailyCalories(YEAR)).rejects.toBeInstanceOf(
        GarminUnavailableError,
      );
      expect(dailySummaryHits).toHaveLength(2);
    });

    it('lève GarminAccessDeniedError quand Garmin refuse le jeton sur le résumé quotidien', async () => {
      dailySummariesHandler = (_req, res) => reply(res, 401, {});

      await expect(adapter().fetchDailyCalories(RANGE)).rejects.toBeInstanceOf(
        GarminAccessDeniedError,
      );
    });

    it('ne transmet ni cause ni secret dans l erreur du résumé quotidien', async () => {
      dailySummariesHandler = (_req, res) => reply(res, 503, {});

      const error = (await rejection(
        adapter().fetchDailyCalories(RANGE),
      )) as Error;

      expect(error).toBeInstanceOf(GarminUnavailableError);
      expect(error.cause).toBeUndefined();
      const dump = `${error.message} ${error.stack ?? ''} ${JSON.stringify(error)}`;
      expect(dump).not.toContain(API_KEY);
      expect(dump).not.toContain(fakeJwt(1));
    });

    it('ne journalise ni la clé ni le jeton lors de la lecture des calories', async () => {
      dailySummariesHandler = (_req, res) =>
        reply(res, 200, { data: [dailySummaryItem('2026-11-01', 2100)] });

      await adapter().fetchDailyCalories(RANGE);

      const output = logged.join('\n');
      expect(output).not.toContain(API_KEY);
      expect(output).not.toContain(fakeJwt(1));
    });
  });

  describe('confidentialité', () => {
    it.each([
      ['clé refusée', () => (tokenHandler = (_r, res) => reply(res, 401, {}))],
      [
        'panne Garmin',
        () => (activitiesHandler = (_r, res) => reply(res, 500, {})),
      ],
      [
        'enveloppe invalide',
        () => (activitiesHandler = (_r, res) => reply(res, 200, 'pas du json')),
      ],
    ])(
      "ne transmet ni cause ni secret dans l'erreur (%s)",
      async (_label, arrange) => {
        arrange();

        const error = (await rejection(
          adapter().fetchActivitiesSince(null),
        )) as Error;

        expect(error.cause).toBeUndefined();
        const dump = `${error.message} ${error.stack ?? ''} ${JSON.stringify(error)}`;
        expect(dump).not.toContain(API_KEY);
        expect(dump).not.toContain(fakeJwt(1));
        expect(dump).not.toContain(fakeJwt(2));
        expect(dump).not.toContain(baseUrl);
      },
    );

    it('ne journalise ni la clé ni le jeton', async () => {
      activitiesHandler = (_req, res) => reply(res, 200, [garminItem(1)]);

      await adapter().fetchActivitiesSince(null);

      const output = logged.join('\n');
      expect(output).not.toContain(API_KEY);
      expect(output).not.toContain(fakeJwt(1));
    });
  });
});
