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

const TOKEN_PATH =
  '/personalapitoken-service/personal-api/personal-api-key/token';
const ZONES_PATH = '/biometric-service/heartRateZones/v2';
const API_KEY = 'cle-secrete-garmin-zones-e2e-13579';
const PROBLEM_JSON = /application\/problem\+json/;

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

function reply(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function encode(part: unknown): string {
  return Buffer.from(JSON.stringify(part)).toString('base64url');
}

const FAKE_JWT = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ jti: 'jeton-zones-e2e', exp: 4_102_444_800 })}.signature`;

const DEFAULT_ZONES = {
  sport: 'DEFAULT',
  trainingMethod: 'HR_MAX',
  maxHeartRateUsed: 188,
  restingHeartRateUsed: 52,
  zone1Floor: 94,
  zone2Floor: 113,
  zone3Floor: 131,
  zone4Floor: 150,
  zone5Floor: 169,
  restingHrAutoUpdateUsed: true,
};

describe('Seuils des zones cardiaques (e2e)', () => {
  let garmin: Server;
  let baseUrl: string;
  let tokenHandler: Handler;
  let zonesHandler: Handler;
  let zonesRequests: IncomingMessage[];
  let app: INestApplication<App>;

  beforeAll(async () => {
    garmin = createServer((req, res) => {
      const path = (req.url ?? '').split('?')[0];
      if (path === TOKEN_PATH) {
        tokenHandler(req, res);
        return;
      }
      if (path === ZONES_PATH) {
        zonesRequests.push(req);
        zonesHandler(req, res);
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
    zonesRequests = [];
    tokenHandler = (_req, res) => reply(res, 200, FAKE_JWT);
    zonesHandler = (_req, res) => reply(res, 200, [DEFAULT_ZONES]);

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
  });

  afterEach(async () => {
    await app.close();
  });

  function get() {
    return request(app.getHttpServer()).get('/api/heart-rate-zones');
  }

  it('renvoie les seuils et la méthode de calcul du sport par défaut', async () => {
    const res = await get().expect(200);

    expect(res.body).toEqual({
      available: true,
      trainingMethod: 'HR_MAX',
      maxHeartRateUsed: 188,
      restingHeartRateUsed: 52,
      zone1Floor: 94,
      zone2Floor: 113,
      zone3Floor: 131,
      zone4Floor: 150,
      zone5Floor: 169,
    });
  });

  it('demande à Garmin de ne pas générer de zones par défaut', async () => {
    await get().expect(200);

    const generateDefaults = new URL(
      zonesRequests[0].url ?? '',
      'http://localhost',
    ).searchParams.get('generateDefaults');
    expect(generateDefaults).toBe('false');
  });

  it("signale l'absence de zones sans valeur inventée", async () => {
    zonesHandler = (_req, res) => reply(res, 200, []);

    const res = await get().expect(200);

    expect(res.body).toEqual({
      available: false,
      trainingMethod: null,
      maxHeartRateUsed: null,
      restingHeartRateUsed: null,
      zone1Floor: null,
      zone2Floor: null,
      zone3Floor: null,
      zone4Floor: null,
      zone5Floor: null,
    });
  });

  it('mappe un refus de la clé ou du jeton sur GARMIN_ACCESS_DENIED', async () => {
    zonesHandler = (_req, res) => reply(res, 401, {});

    const res = await get().expect(502);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      status: 502,
      code: 'GARMIN_ACCESS_DENIED',
    });
  });

  it('mappe une panne Garmin sur 503 sans fuite de la clé', async () => {
    zonesHandler = (_req, res) => reply(res, 500, {});

    const res = await get().expect(503);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(JSON.stringify(res.body)).not.toContain(API_KEY);
  });
});
