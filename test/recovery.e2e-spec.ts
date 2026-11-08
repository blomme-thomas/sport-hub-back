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
const SLEEP_PATH = '/sleep-service/sleep/dailySleepSummariesByDate';
const HRV_PREFIX = '/hrv-service/hrv/daily/';
const BODY_BATTERY_PATH =
  '/wellness-service/wellness/bodyBattery/reports/daily';
const HEART_RATE_PATH = '/wellness-service/wellness/dailyHeartRate';
const API_KEY = 'cle-secrete-garmin-recovery-e2e-86420';
const PROBLEM_JSON = /application\/problem\+json/;

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

function reply(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function noContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}

function encode(part: unknown): string {
  return Buffer.from(JSON.stringify(part)).toString('base64url');
}

const FAKE_JWT = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ jti: 'jeton-recovery-e2e', exp: 4_102_444_800 })}.signature`;

describe('Données de récupération (e2e)', () => {
  let garmin: Server;
  let baseUrl: string;
  let tokenHandler: Handler;
  let sleepHandler: Handler;
  let hrvHandler: Handler;
  let bodyBatteryHandler: Handler;
  let heartRateHandler: Handler;
  let heartRateRequests: IncomingMessage[];
  let app: INestApplication<App>;

  beforeAll(async () => {
    garmin = createServer((req, res) => {
      const path = (req.url ?? '').split('?')[0];
      if (path === TOKEN_PATH) {
        tokenHandler(req, res);
      } else if (path === SLEEP_PATH) {
        sleepHandler(req, res);
      } else if (path.startsWith(HRV_PREFIX)) {
        hrvHandler(req, res);
      } else if (path === BODY_BATTERY_PATH) {
        bodyBatteryHandler(req, res);
      } else if (path === HEART_RATE_PATH) {
        heartRateRequests.push(req);
        heartRateHandler(req, res);
      } else {
        reply(res, 404, {});
      }
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
    heartRateRequests = [];
    tokenHandler = (_req, res) => reply(res, 200, FAKE_JWT);
    sleepHandler = (_req, res) =>
      reply(res, 200, [
        { calendarDate: '2026-11-02', sleepTimeSeconds: 27000 },
      ]);
    hrvHandler = (_req, res) =>
      reply(res, 200, {
        hrvSummaries: [
          { calendarDate: '2026-11-02', lastNightAvg: 48, weeklyAvg: 50 },
        ],
      });
    bodyBatteryHandler = (_req, res) =>
      reply(res, 200, [{ date: '2026-11-02', charged: 85, drained: 40 }]);
    heartRateHandler = (req, res) => {
      const date = new URL(req.url ?? '', 'http://localhost').searchParams.get(
        'date',
      );
      if (date === '2026-11-02') {
        reply(res, 200, { calendarDate: date, restingHeartRate: 52 });
        return;
      }
      noContent(res);
    };

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

  function get(from: string, to: string) {
    return request(app.getHttpServer())
      .get('/api/recovery')
      .query({ from, to });
  }

  it('renvoie les données de chaque jour de la plage, null quand elles manquent', async () => {
    const res = await get('2026-11-01', '2026-11-02').expect(200);

    expect(res.body).toEqual({
      from: '2026-11-01',
      to: '2026-11-02',
      days: [
        {
          date: '2026-11-01',
          sleepSeconds: null,
          hrvLastNightAvg: null,
          hrvWeeklyAvg: null,
          bodyBatteryCharged: null,
          bodyBatteryDrained: null,
          restingHeartRate: null,
        },
        {
          date: '2026-11-02',
          sleepSeconds: 27000,
          hrvLastNightAvg: 48,
          hrvWeeklyAvg: 50,
          bodyBatteryCharged: 85,
          bodyBatteryDrained: 40,
          restingHeartRate: 52,
        },
      ],
    });
  });

  it('interroge la fréquence cardiaque de repos pour chaque jour de la plage', async () => {
    await get('2026-11-01', '2026-11-03').expect(200);

    const dates = heartRateRequests.map((req) =>
      new URL(req.url ?? '', 'http://localhost').searchParams.get('date'),
    );
    expect(dates).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('traite un 204 de la HRV comme absence de donnée', async () => {
    hrvHandler = (_req, res) => noContent(res);

    const res = await get('2026-11-02', '2026-11-02').expect(200);

    expect(res.body.days[0]).toMatchObject({
      hrvLastNightAvg: null,
      hrvWeeklyAvg: null,
      sleepSeconds: 27000,
    });
  });

  it('accepte une plage de 31 jours', async () => {
    await get('2026-11-01', '2026-12-01').expect(200);
  });

  it('refuse une plage de plus de 31 jours en 400', async () => {
    const res = await get('2026-11-01', '2026-12-02').expect(400);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
  });

  it('refuse une date de fin antérieure à la date de début en 400', async () => {
    await get('2026-11-05', '2026-11-01').expect(400);
  });

  it('refuse une date qui n’existe pas en 400', async () => {
    await get('2026-02-30', '2026-03-01').expect(400);
  });

  it('mappe un refus de la clé ou du jeton sur GARMIN_ACCESS_DENIED', async () => {
    sleepHandler = (_req, res) => reply(res, 401, {});

    const res = await get('2026-11-01', '2026-11-02').expect(502);

    expect(res.body).toMatchObject({ code: 'GARMIN_ACCESS_DENIED' });
  });

  it('mappe une panne Garmin sur 503 sans fuite de la clé', async () => {
    bodyBatteryHandler = (_req, res) => reply(res, 500, {});

    const res = await get('2026-11-01', '2026-11-02').expect(503);

    expect(JSON.stringify(res.body)).not.toContain(API_KEY);
  });
});
