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
const SETTINGS_PATH = '/userprofile-service/userprofile/settings';
const API_KEY = 'cle-secrete-garmin-profil-e2e-24680';
const TOKEN = 'jeton-profil-e2e-secret';
const PROBLEM_JSON = /application\/problem\+json/;

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

function reply(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function encode(part: unknown): string {
  return Buffer.from(JSON.stringify(part)).toString('base64url');
}

const FAKE_JWT = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ jti: TOKEN, exp: 4_102_444_800 })}.signature`;

describe('Profil Garmin (e2e)', () => {
  let garmin: Server;
  let baseUrl: string;
  let tokenHandler: Handler;
  let settingsHandler: Handler;
  let app: INestApplication<App>;

  beforeAll(async () => {
    garmin = createServer((req, res) => {
      const path = (req.url ?? '').split('?')[0];
      if (path === TOKEN_PATH) {
        tokenHandler(req, res);
        return;
      }
      if (path === SETTINGS_PATH) {
        settingsHandler(req, res);
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
    tokenHandler = (_req, res) => reply(res, 200, FAKE_JWT);
    settingsHandler = (_req, res) =>
      reply(res, 200, { displayName: 'Thomas', measurementSystem: 'metric' });

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
    return request(app.getHttpServer()).get('/api/profile');
  }

  it('renvoie le nom affiché du compte Garmin', async () => {
    const res = await get().expect(200);

    expect(res.body).toEqual({ displayName: 'Thomas' });
  });

  it('renvoie null quand Garmin ne fournit pas de nom affiché', async () => {
    settingsHandler = (_req, res) =>
      reply(res, 200, { measurementSystem: 'metric' });

    const res = await get().expect(200);

    expect(res.body).toEqual({ displayName: null });
  });

  it('renvoie null pour un nom affiché vide', async () => {
    settingsHandler = (_req, res) => reply(res, 200, { displayName: '   ' });

    const res = await get().expect(200);

    expect(res.body).toEqual({ displayName: null });
  });

  it('mappe un refus de la clé ou du jeton sur GARMIN_ACCESS_DENIED', async () => {
    settingsHandler = (_req, res) => reply(res, 401, {});

    const res = await get().expect(502);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      status: 502,
      code: 'GARMIN_ACCESS_DENIED',
    });
  });

  it('mappe une panne Garmin sur 503 sans détail interne', async () => {
    settingsHandler = (_req, res) => reply(res, 500, {});

    const res = await get().expect(503);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(JSON.stringify(res.body)).not.toContain(API_KEY);
    expect(JSON.stringify(res.body)).not.toContain(TOKEN);
  });

  it('ne laisse fuiter ni la clé ni le jeton dans la réponse', async () => {
    const res = await get().expect(200);

    expect(JSON.stringify(res.body)).not.toContain(API_KEY);
    expect(JSON.stringify(res.body)).not.toContain(TOKEN);
  });
});
