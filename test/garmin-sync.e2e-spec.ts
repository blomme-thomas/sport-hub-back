import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { garminConfig } from './../src/core/config/index.js';
import {
  DEFAULT_HTTP_CLIENT_OPTIONS,
  HTTP_CLIENT_DEFAULTS,
} from './../src/core/http/http-client.types.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const TOKEN_PATH =
  '/personalapitoken-service/personal-api/personal-api-key/token';
const ACTIVITIES_PATH = '/activitylist-service/activities/search/activities';
const API_KEY = 'cle-secrete-garmin-e2e-98765';
const PROBLEM_JSON = /application\/problem\+json/;

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

function reply(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function encode(part: unknown): string {
  return Buffer.from(JSON.stringify(part)).toString('base64url');
}

const FAKE_JWT = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ jti: 'jeton-e2e', exp: 4_102_444_800 })}.signature`;

function garminItem(id: number, overrides: Record<string, unknown> = {}) {
  return {
    activityId: id,
    activityName: 'Sortie',
    activityType: { typeKey: 'running' },
    startTimeGMT: '2026-05-01 06:30:00',
    duration: 3600,
    distance: 10000,
    ...overrides,
  };
}

describe('Synchronisation Garmin (e2e)', () => {
  let garmin: Server;
  let baseUrl: string;
  let tokenHandler: Handler;
  let activitiesHandler: Handler;
  let activityRequests: IncomingMessage[];
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    garmin = createServer((req, res) => {
      const path = (req.url ?? '').split('?')[0];
      if (path === TOKEN_PATH) {
        tokenHandler(req, res);
        return;
      }
      if (path === ACTIVITIES_PATH) {
        activityRequests.push(req);
        activitiesHandler(req, res);
        return;
      }
      reply(res, 404, {});
    });
    await new Promise<void>((resolve) =>
      garmin.listen(0, '127.0.0.1', resolve),
    );
    baseUrl = `http://127.0.0.1:${(garmin.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    garmin.closeAllConnections();
    await new Promise<void>((resolve) => garmin.close(() => resolve()));
  });

  beforeEach(async () => {
    activityRequests = [];
    tokenHandler = (_req, res) => reply(res, 200, FAKE_JWT);
    activitiesHandler = (_req, res) => reply(res, 200, []);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(garminConfig.KEY)
      .useValue({ personalApiKey: API_KEY, personalApiBaseUrl: baseUrl })
      .overrideProvider(HTTP_CLIENT_DEFAULTS)
      .useValue({
        ...DEFAULT_HTTP_CLIENT_OPTIONS,
        timeoutMs: 2_000,
        maxRetries: 0,
        backoffBaseMs: 5,
        backoffMaxMs: 20,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.activity.deleteMany();
    await prisma.discipline.deleteMany();
  });

  afterEach(async () => {
    await prisma.activity.deleteMany();
    await prisma.discipline.deleteMany();
    await app.close();
  });

  function run() {
    return request(app.getHttpServer()).post('/api/garmin-sync/run');
  }

  it('premiere_execution_cree_les_activites_et_renvoie_le_resume', async () => {
    activitiesHandler = (_req, res) =>
      reply(res, 200, [garminItem(1), garminItem(2)]);

    const res = await run().expect(200);

    expect(res.body).toEqual({ created: 2, updated: 0, ignored: 0 });
    expect(await prisma.activity.count()).toBe(2);
  });

  it('enregistre_les_valeurs_traduites_depuis_le_format_garmin', async () => {
    activitiesHandler = (_req, res) =>
      reply(res, 200, [
        garminItem(77, {
          activityType: { typeKey: 'cycling' },
          startTimeGMT: '2026-05-03 07:15:30',
          duration: 1800.5,
          distance: 25000,
        }),
      ]);

    await run().expect(200);

    const stored = await prisma.activity.findUniqueOrThrow({
      where: { garminActivityId: '77' },
    });
    expect(stored.type).toBe('cycling');
    expect(stored.startedAt.toISOString()).toBe('2026-05-03T07:15:30.000Z');
    expect(stored.durationSeconds).toBe(1800.5);
    expect(stored.distanceMeters).toBe(25000);
  });

  it('rejeu_ne_cree_aucun_doublon_et_ignore_les_activites_connues', async () => {
    activitiesHandler = (_req, res) =>
      reply(res, 200, [garminItem(1), garminItem(2)]);
    await run().expect(200);

    const res = await run().expect(200);

    expect(res.body).toEqual({ created: 0, updated: 0, ignored: 2 });
    expect(await prisma.activity.count()).toBe(2);
  });

  it('payload_modifie_met_a_jour_l_activite_existante', async () => {
    activitiesHandler = (_req, res) =>
      reply(res, 200, [garminItem(1), garminItem(2)]);
    await run().expect(200);
    activitiesHandler = (_req, res) =>
      reply(res, 200, [
        garminItem(1, { activityName: 'Renommée' }),
        garminItem(2),
      ]);

    const res = await run().expect(200);

    expect(res.body).toEqual({ created: 0, updated: 1, ignored: 1 });
    expect(await prisma.activity.count()).toBe(2);
    const stored = await prisma.activity.findUniqueOrThrow({
      where: { garminActivityId: '1' },
    });
    expect(stored.rawPayload).toMatchObject({ activityName: 'Renommée' });
  });

  it('seconde_execution_reprend_la_fenetre_de_sept_jours_moins_un_jour', async () => {
    activitiesHandler = (_req, res) => reply(res, 200, [garminItem(1)]);
    await run().expect(200);
    activityRequests = [];

    await run().expect(200);

    const startDate = new URL(
      activityRequests[0].url ?? '',
      'http://localhost',
    ).searchParams.get('startDate');
    expect(startDate).toBe('2026-04-23');
  });

  it('activite_invalide_est_sautee_sans_faire_echouer_la_synchronisation', async () => {
    activitiesHandler = (_req, res) =>
      reply(res, 200, [garminItem(1), garminItem(2, { duration: -1 })]);

    const res = await run().expect(200);

    expect(res.body).toEqual({ created: 1, updated: 0, ignored: 0 });
  });

  it('jeton_rejete_par_garmin_repond_502_GARMIN_ACCESS_DENIED', async () => {
    activitiesHandler = (_req, res) => reply(res, 401, {});

    const res = await run().expect(502);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      status: 502,
      code: 'GARMIN_ACCESS_DENIED',
    });
    expect(await prisma.activity.count()).toBe(0);
  });

  it('cle_refusee_repond_502_GARMIN_ACCESS_DENIED', async () => {
    tokenHandler = (_req, res) => reply(res, 403, {});

    const res = await run().expect(502);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({ code: 'GARMIN_ACCESS_DENIED' });
  });

  it('panne_garmin_repond_503_GARMIN_UNAVAILABLE', async () => {
    activitiesHandler = (_req, res) => reply(res, 500, {});

    const res = await run().expect(503);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      status: 503,
      code: 'GARMIN_UNAVAILABLE',
    });
    expect(await prisma.activity.count()).toBe(0);
  });

  it('panne_du_service_de_jeton_repond_503_GARMIN_UNAVAILABLE', async () => {
    tokenHandler = (_req, res) => reply(res, 500, {});

    const res = await run().expect(503);

    expect(res.body).toMatchObject({ code: 'GARMIN_UNAVAILABLE' });
  });

  it.each([
    ['cle_refusee', 401],
    ['panne_garmin', 500],
  ])('%s_ne_fuite_ni_cle_ni_jeton_ni_url_interne', async (_label, status) => {
    tokenHandler = (_req, res) =>
      status === 401
        ? reply(res, 401, { detail: API_KEY })
        : reply(res, 200, FAKE_JWT);
    activitiesHandler = (_req, res) => reply(res, status, { detail: API_KEY });

    const res = await run();

    const body = JSON.stringify(res.body);
    expect(body).not.toContain(API_KEY);
    expect(body).not.toContain(FAKE_JWT);
    expect(body).not.toContain(baseUrl);
    expect(body).not.toContain('127.0.0.1');
    expect(res.body).not.toHaveProperty('stack');
  });

  describe('disciplines', () => {
    function disciplinesList() {
      return request(app.getHttpServer()).get('/api/disciplines');
    }

    it('type_inconnu_cree_une_discipline_dont_le_libelle_est_la_cle', async () => {
      activitiesHandler = (_req, res) =>
        reply(res, 200, [
          garminItem(1, { activityType: { typeKey: 'strength_training' } }),
        ]);

      await run().expect(200);

      const res = await disciplinesList().expect(200);
      expect(res.body.items).toEqual([
        expect.objectContaining({
          typeKey: 'strength_training',
          label: 'strength_training',
        }),
      ]);
    });

    it('resynchronisation_avance_la_derniere_apparition_sans_doublon', async () => {
      const seenBefore = new Date('2026-01-01T00:00:00.000Z');
      await prisma.discipline.create({
        data: {
          typeKey: 'running',
          label: 'running',
          firstSeenAt: seenBefore,
          lastSeenAt: seenBefore,
        },
      });
      activitiesHandler = (_req, res) => reply(res, 200, [garminItem(1)]);

      await run().expect(200);

      const stored = await prisma.discipline.findMany();
      expect(stored).toHaveLength(1);
      expect(stored[0].firstSeenAt).toEqual(seenBefore);
      expect(stored[0].lastSeenAt.getTime()).toBeGreaterThan(
        seenBefore.getTime(),
      );
    });

    it('libelle_renomme_est_conserve_apres_resynchronisation', async () => {
      activitiesHandler = (_req, res) => reply(res, 200, [garminItem(1)]);
      await run().expect(200);
      await request(app.getHttpServer())
        .patch('/api/disciplines/running')
        .send({ label: 'Course à pied' })
        .expect(200);

      await run().expect(200);

      const res = await disciplinesList().expect(200);
      expect(res.body.items).toEqual([
        expect.objectContaining({ typeKey: 'running', label: 'Course à pied' }),
      ]);
    });

    it('activite_sans_typeKey_est_ignoree_sans_creer_de_discipline_vide', async () => {
      activitiesHandler = (_req, res) =>
        reply(res, 200, [garminItem(1, { activityType: {} })]);

      const res = await run().expect(200);

      expect(res.body).toEqual({ created: 0, updated: 0, ignored: 0 });
      expect(await prisma.discipline.count()).toBe(0);
    });
  });
});
