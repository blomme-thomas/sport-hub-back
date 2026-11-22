import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { runWithCorrelationId } from '../middlewares/correlation-id.storage.js';
import { ExternalServiceError } from './external-service.error.js';
import { HttpClientModule } from './http-client.module.js';
import { HttpClientService } from './http-client.service.js';
import {
  DEFAULT_HTTP_CLIENT_OPTIONS,
  HTTP_CLIENT_DEFAULTS,
} from './http-client.types.js';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const FAST_DEFAULTS = {
  ...DEFAULT_HTTP_CLIENT_OPTIONS,
  timeoutMs: 2_000,
  maxRetries: 2,
  backoffBaseMs: 5,
  backoffMaxMs: 20,
};

function reply(
  res: ServerResponse,
  status: number,
  body: unknown = { ok: true },
): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function failure(
  promise: Promise<unknown>,
): Promise<ExternalServiceError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ExternalServiceError);
  return error as ExternalServiceError;
}

describe('HttpClientService', () => {
  let server: Server;
  let baseUrl: string;
  let handler: Handler;
  let hits: IncomingMessage[];
  let moduleRef: TestingModule;
  let client: HttpClientService;
  let logged: string[];

  async function build(defaults = FAST_DEFAULTS): Promise<void> {
    moduleRef = await Test.createTestingModule({
      imports: [HttpClientModule],
    })
      .overrideProvider(HTTP_CLIENT_DEFAULTS)
      .useValue(defaults)
      .compile();
    client = moduleRef.get(HttpClientService);
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
    handler = (_req, res) => reply(res, 200);
    logged = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation(
        (...args: unknown[]) => {
          logged.push(args.map((a) => String(a)).join(' '));
        },
      );
    }
    await build();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await moduleRef.close();
  });

  describe('succès', () => {
    it('renvoie le statut et le corps JSON d une réponse 200', async () => {
      handler = (_req, res) => reply(res, 200, { hello: 'world' });

      const response = await client.get<{ hello: string }>(
        'garmin',
        `${baseUrl}/ping`,
      );

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ hello: 'world' });
      expect(hits).toHaveLength(1);
    });

    it('transmet les en-têtes fournis', async () => {
      await client.get('garmin', `${baseUrl}/ping`, {
        headers: { 'x-custom': 'abc' },
      });

      expect(hits[0].headers['x-custom']).toBe('abc');
    });

    it('envoie le corps JSON d un POST', async () => {
      let received = '';
      handler = (req, res) => {
        req.on('data', (chunk: Buffer) => (received += chunk.toString()));
        req.on('end', () => reply(res, 201, { id: 1 }));
      };

      const response = await client.post('garmin', `${baseUrl}/items`, {
        name: 'run',
      });

      expect(response.status).toBe(201);
      expect(hits[0].method).toBe('POST');
      expect(JSON.parse(received)).toEqual({ name: 'run' });
    });

    it('permet d appeler request avec une méthode explicite', async () => {
      const response = await client.request('garmin', {
        method: 'PUT',
        url: `${baseUrl}/items/1`,
        data: { name: 'x' },
      });

      expect(response.status).toBe(200);
      expect(hits[0].method).toBe('PUT');
    });
  });

  describe('timeout', () => {
    it('lève ExternalServiceError TIMEOUT après épuisement des réessais', async () => {
      await build({ ...FAST_DEFAULTS, timeoutMs: 50 });
      handler = () => {};

      const error = await failure(client.get('garmin', `${baseUrl}/slow`));

      expect(error.failure).toBe('TIMEOUT');
      expect(error.target).toBe('garmin');
      expect(error.attempts).toBe(3);
      expect(hits).toHaveLength(3);
    });

    it('applique le timeout par défaut quand aucun n est fourni', async () => {
      await build({ ...FAST_DEFAULTS, timeoutMs: 50, maxRetries: 0 });
      handler = (_req, res) => setTimeout(() => reply(res, 200), 300);

      const error = await failure(client.get('garmin', `${baseUrl}/slow`));

      expect(error.failure).toBe('TIMEOUT');
    });

    it('surcharge le timeout par défaut pour un appel donné (plus long)', async () => {
      await build({ ...FAST_DEFAULTS, timeoutMs: 50, maxRetries: 0 });
      handler = (_req, res) => setTimeout(() => reply(res, 200), 200);

      const response = await client.get('garmin', `${baseUrl}/slow`, {
        timeoutMs: 2_000,
      });

      expect(response.status).toBe(200);
    });

    it('surcharge le timeout par défaut pour un appel donné (plus court)', async () => {
      await build({ ...FAST_DEFAULTS, timeoutMs: 5_000, maxRetries: 0 });
      handler = (_req, res) => setTimeout(() => reply(res, 200), 500);

      const error = await failure(
        client.get('garmin', `${baseUrl}/slow`, { timeoutMs: 50 }),
      );

      expect(error.failure).toBe('TIMEOUT');
      expect(error.attempts).toBe(1);
    });

    it('ne réessaie pas un timeout sur une requête non idempotente', async () => {
      await build({ ...FAST_DEFAULTS, timeoutMs: 50 });
      handler = () => {};

      const error = await failure(
        client.post('garmin', `${baseUrl}/slow`, { a: 1 }),
      );

      expect(error.failure).toBe('TIMEOUT');
      expect(error.attempts).toBe(1);
      expect(hits).toHaveLength(1);
    });
  });

  describe('réessais sur 5xx', () => {
    it('réessaie un 503 puis renvoie le 200 obtenu', async () => {
      let count = 0;
      handler = (_req, res) => {
        count += 1;
        if (count === 1) {
          reply(res, 503);
          return;
        }
        reply(res, 200, { recovered: true });
      };

      const response = await client.get<{ recovered: boolean }>(
        'garmin',
        `${baseUrl}/flaky`,
      );

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ recovered: true });
      expect(hits).toHaveLength(2);
    });

    it('lève HTTP_STATUS avec maxRetries + 1 tentatives sur un 503 permanent', async () => {
      handler = (_req, res) => reply(res, 503);

      const error = await failure(client.get('garmin', `${baseUrl}/down`));

      expect(error.failure).toBe('HTTP_STATUS');
      expect(error.upstreamStatus).toBe(503);
      expect(error.attempts).toBe(3);
      expect(hits).toHaveLength(3);
    });

    it('respecte un maxRetries configuré à 0', async () => {
      await build({ ...FAST_DEFAULTS, maxRetries: 0 });
      handler = (_req, res) => reply(res, 500);

      const error = await failure(client.get('garmin', `${baseUrl}/down`));

      expect(error.attempts).toBe(1);
      expect(hits).toHaveLength(1);
    });

    it('attend le backoff entre deux tentatives', async () => {
      await build({
        ...FAST_DEFAULTS,
        maxRetries: 2,
        backoffBaseMs: 100,
        backoffMaxMs: 1_000,
      });
      handler = (_req, res) => reply(res, 503);
      const start = Date.now();

      await failure(client.get('garmin', `${baseUrl}/down`));

      expect(Date.now() - start).toBeGreaterThanOrEqual(280);
    });

    it('ne réessaie pas un POST en 503', async () => {
      handler = (_req, res) => reply(res, 503);

      const error = await failure(
        client.post('garmin', `${baseUrl}/items`, { a: 1 }),
      );

      expect(error.failure).toBe('HTTP_STATUS');
      expect(error.upstreamStatus).toBe(503);
      expect(error.attempts).toBe(1);
      expect(hits).toHaveLength(1);
    });
  });

  describe('statuts 4xx', () => {
    it.each([400, 401, 403, 404, 429])(
      'lève HTTP_STATUS %i sans aucun réessai',
      async (status) => {
        handler = (_req, res) => reply(res, status);

        const error = await failure(client.get('garmin', `${baseUrl}/nope`));

        expect(error.failure).toBe('HTTP_STATUS');
        expect(error.upstreamStatus).toBe(status);
        expect(error.attempts).toBe(1);
        expect(hits).toHaveLength(1);
      },
    );
  });

  describe('erreur réseau', () => {
    let closedUrl: string;

    beforeEach(async () => {
      const probe = createServer();
      await new Promise<void>((resolve) =>
        probe.listen(0, '127.0.0.1', resolve),
      );
      closedUrl = `http://127.0.0.1:${(probe.address() as AddressInfo).port}`;
      await new Promise<void>((resolve) => probe.close(() => resolve()));
    });

    it('lève NETWORK sur un port fermé après maxRetries + 1 tentatives', async () => {
      const error = await failure(client.get('garmin', `${closedUrl}/x`));

      expect(error.failure).toBe('NETWORK');
      expect(error.upstreamStatus).toBeUndefined();
      expect(error.attempts).toBe(3);
    });

    it('ne réessaie pas une erreur réseau sur un POST', async () => {
      const error = await failure(
        client.post('garmin', `${closedUrl}/x`, { a: 1 }),
      );

      expect(error.failure).toBe('NETWORK');
      expect(error.attempts).toBe(1);
    });
  });

  describe('confidentialité', () => {
    const secretHeader = 'Bearer super-secret-token';

    it('ne met aucun secret dans l erreur ni dans sa cause', async () => {
      handler = (_req, res) => reply(res, 500, { detail: 'provider-detail' });

      const error = await failure(
        client.get(
          'garmin',
          `http://user:pw-secret@${baseUrl.replace('http://', '')}/a?token=query-secret`,
          { headers: { Authorization: secretHeader } },
        ),
      );

      expect(error.cause).toBeUndefined();
      const dump = `${error.message} ${error.stack ?? ''} ${JSON.stringify(error)}`;
      for (const secret of [
        'super-secret-token',
        'pw-secret',
        'query-secret',
        'provider-detail',
      ]) {
        expect(dump).not.toContain(secret);
      }
    });

    it('ne journalise ni en-têtes, ni query, ni userinfo, ni corps', async () => {
      handler = (_req, res) => reply(res, 200, { body: 'body-secret' });

      await client.post(
        'garmin',
        `http://user:pw-secret@${baseUrl.replace('http://', '')}/a?token=query-secret`,
        { password: 'body-secret' },
        { headers: { Authorization: secretHeader } },
      );

      const output = logged.join('\n');
      for (const secret of [
        'super-secret-token',
        'Authorization',
        'pw-secret',
        'user:',
        'query-secret',
        'token=',
        'body-secret',
      ]) {
        expect(output).not.toContain(secret);
      }
    });

    it('ne journalise aucun secret lors d un échec', async () => {
      handler = (_req, res) => reply(res, 500);

      await failure(
        client.get('garmin', `${baseUrl}/a?token=query-secret`, {
          headers: { Authorization: secretHeader },
        }),
      );

      const output = logged.join('\n');
      expect(output).not.toContain('super-secret-token');
      expect(output).not.toContain('query-secret');
    });
  });

  describe('journalisation', () => {
    it('trace correlationId, cible, méthode, origine, chemin et statut', async () => {
      await runWithCorrelationId('corr-123', () =>
        client.get('garmin', `${baseUrl}/activities/42`),
      );

      const output = logged.join('\n');
      expect(output).toContain('corr-123');
      expect(output).toContain('garmin');
      expect(output).toContain('GET');
      expect(output).toContain(`${baseUrl}/activities/42`);
      expect(output).toContain('200');
    });

    it('trace le type de défaillance et le statut en cas d échec', async () => {
      handler = (_req, res) => reply(res, 404);

      await runWithCorrelationId('corr-404', () =>
        failure(client.get('garmin', `${baseUrl}/missing`)),
      );

      const output = logged.join('\n');
      expect(output).toContain('corr-404');
      expect(output).toContain('404');
    });

    it('fonctionne sans correlation id courant', async () => {
      await expect(
        client.get('garmin', `${baseUrl}/ping`),
      ).resolves.toMatchObject({ status: 200 });
    });
  });
});
