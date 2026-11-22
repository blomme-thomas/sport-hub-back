import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ExternalServiceError } from '../../../../core/http/external-service.error.js';
import { HttpClientModule } from '../../../../core/http/http-client.module.js';
import { HttpClientService } from '../../../../core/http/http-client.service.js';
import {
  DEFAULT_HTTP_CLIENT_OPTIONS,
  HTTP_CLIENT_DEFAULTS,
} from '../../../../core/http/http-client.types.js';
import { GarminAuthenticationError } from './garmin-authentication.error.js';
import { GarminPersonalApiTokenProvider } from './garmin-personal-api-token.provider.js';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const TOKEN_PATH =
  '/personalapitoken-service/personal-api/personal-api-key/token';
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

function jwt(claims: object): string {
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(claims)}.signature`;
}

function token(id: string, lifetimeSeconds = 3600): string {
  return jwt({
    jti: id,
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (e: unknown) => e,
  );
}

async function authFailure(
  promise: Promise<unknown>,
): Promise<GarminAuthenticationError> {
  const error = await rejection(promise);
  expect(error).toBeInstanceOf(GarminAuthenticationError);
  return error as GarminAuthenticationError;
}

describe('GarminPersonalApiTokenProvider', () => {
  let server: Server;
  let baseUrl: string;
  let handler: Handler;
  let hits: IncomingMessage[];
  let moduleRef: TestingModule;
  let http: HttpClientService;
  let logged: string[];

  function provider(...key: [] | [string | undefined]) {
    return new GarminPersonalApiTokenProvider(http, {
      personalApiKey: key.length === 0 ? API_KEY : key[0],
      personalApiBaseUrl: baseUrl,
      syncCronEnabled: false,
      syncCronExpression: '0 */3 * * *',
    });
  }

  beforeAll(async () => {
    server = createServer((req, res) => {
      hits.push(req);
      handler(req, res);
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
    hits = [];
    let count = 0;
    handler = (_req, res) => {
      count += 1;
      reply(res, 200, token(`jeton-${count}`));
    };
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

  describe('obtention du jeton', () => {
    it('renvoie le JWT fourni par Garmin tel quel', async () => {
      const issued = token('jeton-abc');
      handler = (_req, res) => reply(res, 200, issued);

      await expect(provider().getAccessToken()).resolves.toBe(issued);
    });

    it('accepte un JWT de 24 heures comme celui de Garmin', async () => {
      const issued = token('jeton-24h', 86_400);
      handler = (_req, res) => reply(res, 200, issued);

      await expect(provider().getAccessToken()).resolves.toBe(issued);
    });

    it('appelle le chemin du service de jeton en POST', async () => {
      await provider().getAccessToken();

      expect(hits).toHaveLength(1);
      expect(hits[0].method).toBe('POST');
      expect(hits[0].url).toBe(TOKEN_PATH);
    });

    it("envoie la clé dans l'en-tête Authorization: ApiKey", async () => {
      await provider().getAccessToken();

      expect(hits[0].headers.authorization).toBe(`ApiKey ${API_KEY}`);
    });

    it("n'envoie la clé ni dans l'URL ni dans la query", async () => {
      await provider().getAccessToken();

      expect(hits[0].url).not.toContain(API_KEY);
    });
  });

  describe('réutilisation et expiration', () => {
    it('réutilise le jeton en mémoire sans nouvel appel', async () => {
      const p = provider();

      const first = await p.getAccessToken();
      const second = await p.getAccessToken();

      expect(second).toBe(first);
      expect(hits).toHaveLength(1);
    });

    it('réutilise le jeton tant que la marge de 60 secondes n est pas atteinte', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const p = provider();
      await p.getAccessToken();

      vi.setSystemTime(new Date('2026-01-01T00:58:00Z'));
      await p.getAccessToken();

      expect(hits).toHaveLength(1);
    });

    it('redemande un jeton lorsque l expiration est à moins de 60 secondes', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const p = provider();
      const first = await p.getAccessToken();

      vi.setSystemTime(new Date('2026-01-01T00:59:30Z'));
      const second = await p.getAccessToken();

      expect(hits).toHaveLength(2);
      expect(second).not.toBe(first);
    });

    it('redemande un jeton une fois expiré', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      handler = (_req, res) => reply(res, 200, token('court', 120));
      const p = provider();
      await p.getAccessToken();

      vi.setSystemTime(new Date('2026-01-01T00:03:00Z'));
      await p.getAccessToken();

      expect(hits).toHaveLength(2);
    });

    it("déduit l'expiration du claim exp du jeton", async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      handler = (_req, res) => reply(res, 200, token('exp', 86_400));
      const p = provider();
      await p.getAccessToken();

      vi.setSystemTime(new Date('2026-01-01T23:58:00Z'));
      await p.getAccessToken();
      expect(hits).toHaveLength(1);

      vi.setSystemTime(new Date('2026-01-01T23:59:30Z'));
      await p.getAccessToken();
      expect(hits).toHaveLength(2);
    });

    it('redemande un jeton après invalidate()', async () => {
      const p = provider();
      const first = await p.getAccessToken();

      p.invalidate();
      const second = await p.getAccessToken();

      expect(hits).toHaveLength(2);
      expect(second).not.toBe(first);
    });

    it('accepte invalidate() sans jeton en mémoire', async () => {
      const p = provider();

      expect(() => p.invalidate()).not.toThrow();
      await expect(p.getAccessToken()).resolves.toBeDefined();
    });
  });

  describe('appels simultanés', () => {
    it('mutualise un seul appel HTTP pour des demandes concurrentes', async () => {
      const shared = token('partage');
      handler = (_req, res) => setTimeout(() => reply(res, 200, shared), 50);
      const p = provider();

      const tokens = await Promise.all([
        p.getAccessToken(),
        p.getAccessToken(),
        p.getAccessToken(),
      ]);

      expect(tokens).toEqual([shared, shared, shared]);
      expect(hits).toHaveLength(1);
    });

    it('propage le même échec à toutes les demandes concurrentes avec un seul appel', async () => {
      handler = (_req, res) => setTimeout(() => reply(res, 401, {}), 50);
      const p = provider();

      const errors = await Promise.all([
        authFailure(p.getAccessToken()),
        authFailure(p.getAccessToken()),
      ]);

      expect(errors.map((e) => e.failure)).toEqual([
        'KEY_REJECTED',
        'KEY_REJECTED',
      ]);
      expect(hits).toHaveLength(1);
    });

    it("retente l'obtention après un échec", async () => {
      const recovered = token('retabli');
      let count = 0;
      handler = (_req, res) => {
        count += 1;
        if (count === 1) {
          reply(res, 401, {});
          return;
        }
        reply(res, 200, recovered);
      };
      const p = provider();
      await authFailure(p.getAccessToken());

      await expect(p.getAccessToken()).resolves.toBe(recovered);
      expect(hits).toHaveLength(2);
    });
  });

  describe('clé absente', () => {
    it('lève KEY_MISSING sans aucun appel HTTP', async () => {
      const error = await authFailure(provider(undefined).getAccessToken());

      expect(error.failure).toBe('KEY_MISSING');
      expect(hits).toHaveLength(0);
    });

    it('traite une clé vide comme absente', async () => {
      const error = await authFailure(provider('').getAccessToken());

      expect(error.failure).toBe('KEY_MISSING');
      expect(hits).toHaveLength(0);
    });
  });

  describe('clé refusée', () => {
    it.each([401, 403])(
      'lève KEY_REJECTED sur un statut %i',
      async (status) => {
        handler = (_req, res) => reply(res, status, { error: 'denied' });

        const error = await authFailure(provider().getAccessToken());

        expect(error.failure).toBe('KEY_REJECTED');
        expect(hits).toHaveLength(1);
      },
    );

    it('ne met pas la clé en cache après un refus', async () => {
      handler = (_req, res) => reply(res, 403, {});
      const p = provider();
      await authFailure(p.getAccessToken());
      await authFailure(p.getAccessToken());

      expect(hits).toHaveLength(2);
    });
  });

  describe('réponse inattendue', () => {
    it.each([
      ['un corps non JSON', 'pas du json'],
      ['un corps vide', ''],
      ['un objet JSON', { access_token: 'abc', expires_in: 3600 }],
      ['un tableau', ['abc']],
      ['null', 'null'],
      ['un nombre', '42'],
      ['un jeton à deux segments', 'aaa.bbb'],
      [
        "un jeton dont le payload n'est pas du JSON",
        `${encode({ alg: 'RS256' })}.${Buffer.from('pas du json').toString('base64url')}.signature`,
      ],
      ['un jeton sans claim exp', jwt({ jti: 'sans-exp' })],
      ['un jeton avec un exp textuel', jwt({ exp: 'demain' })],
      ['un jeton avec un exp négatif', jwt({ exp: -5 })],
    ])('lève UNEXPECTED_RESPONSE sur %s', async (_label, body) => {
      handler = (_req, res) => reply(res, 200, body);

      const error = await authFailure(provider().getAccessToken());

      expect(error.failure).toBe('UNEXPECTED_RESPONSE');
    });

    it('ne met rien en cache après une réponse inattendue', async () => {
      handler = (_req, res) => reply(res, 200, { access_token: 'abc' });
      const p = provider();
      await authFailure(p.getAccessToken());
      await authFailure(p.getAccessToken());

      expect(hits).toHaveLength(2);
    });
  });

  describe('indisponibilité du service', () => {
    it('relance ExternalServiceError sur un 500', async () => {
      handler = (_req, res) => reply(res, 500, {});

      const error = await rejection(provider().getAccessToken());

      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error).not.toBeInstanceOf(GarminAuthenticationError);
      expect((error as ExternalServiceError).failure).toBe('HTTP_STATUS');
      expect((error as ExternalServiceError).upstreamStatus).toBe(500);
    });

    it('relance ExternalServiceError sur un timeout', async () => {
      handler = () => {};
      const slowModule = await Test.createTestingModule({
        imports: [HttpClientModule],
      })
        .overrideProvider(HTTP_CLIENT_DEFAULTS)
        .useValue({ ...FAST_DEFAULTS, timeoutMs: 50 })
        .compile();
      const slow = new GarminPersonalApiTokenProvider(
        slowModule.get(HttpClientService),
        {
          personalApiKey: API_KEY,
          personalApiBaseUrl: baseUrl,
          syncCronEnabled: false,
          syncCronExpression: '0 */3 * * *',
        },
      );

      const error = await rejection(slow.getAccessToken());
      await slowModule.close();

      expect(error).toBeInstanceOf(ExternalServiceError);
      expect((error as ExternalServiceError).failure).toBe('TIMEOUT');
    });
  });

  describe('confidentialité de la clé', () => {
    it.each([
      ['KEY_MISSING', undefined, 200],
      ['KEY_REJECTED', API_KEY, 401],
      ['UNEXPECTED_RESPONSE', API_KEY, 200],
    ])(
      "n'inclut pas la clé dans l'erreur %s",
      async (_failure, key, status) => {
        handler = (_req, res) =>
          reply(res, status, status === 200 ? 'pas du json' : {});

        const error = await authFailure(provider(key).getAccessToken());

        const dump = `${error.message} ${error.stack ?? ''} ${JSON.stringify(error)}`;
        expect(dump).not.toContain(API_KEY);
        expect(error.cause).toBeUndefined();
      },
    );

    it("n'inclut pas la clé dans l'erreur d'un service indisponible", async () => {
      handler = (_req, res) => reply(res, 500, {});

      const error = (await rejection(
        provider().getAccessToken(),
      )) as ExternalServiceError;

      const dump = `${error.message} ${error.stack ?? ''} ${JSON.stringify(error)}`;
      expect(dump).not.toContain(API_KEY);
    });

    it('ne journalise ni la clé ni le jeton obtenu', async () => {
      const secret = token('jeton-confidentiel');
      handler = (_req, res) => reply(res, 200, secret);
      const p = provider();
      await p.getAccessToken();

      p.invalidate();
      handler = (_req, res) => reply(res, 401, {});
      await authFailure(p.getAccessToken());

      const output = logged.join('\n');
      expect(output).not.toContain(API_KEY);
      expect(output).not.toContain(secret);
    });
  });
});
