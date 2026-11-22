import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  type ArgumentsHost,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { ValidationError } from 'class-validator';
import { DomainError } from '../../shared/domain/domain-error.js';
import { runWithCorrelationId } from '../middlewares/correlation-id.storage.js';
import { DependencyUnavailableException } from './dependency-unavailable.exception.js';
import { PROBLEM_JSON_CONTENT_TYPE } from './problem-details.js';
import { ProblemDetailsExceptionFilter } from './problem-details.exception-filter.js';
import { RequestValidationException } from './request-validation.exception.js';
import { validationExceptionFactory } from './validation-exception.factory.js';

class WorkoutNotFoundError extends DomainError {
  readonly code = 'WORKOUT_NOT_FOUND';
  constructor(id: string) {
    super(`Workout ${id} not found`);
  }
}

class UnmappedError extends DomainError {
  readonly code = 'SOMETHING_UNMAPPED';
  constructor() {
    super('Règle métier non mappée');
  }
}

class PrototypeKeyError extends DomainError {
  constructor(readonly code: string) {
    super('Code collisionnant avec le prototype');
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Setup {
  filter: ProblemDetailsExceptionFilter;
  host: ArgumentsHost;
  adapter: {
    reply: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };
  res: { headersSent: boolean };
}

function setup(
  options: {
    url?: string;
    method?: string;
    headers?: Record<string, string | string[]>;
    headersSent?: boolean;
    hostType?: string;
    table?: Record<string, number>;
  } = {},
): Setup {
  const url = options.url ?? '/api/workouts/42?secret=1';
  const req = {
    method: options.method ?? 'GET',
    url,
    originalUrl: url,
    headers: options.headers ?? {},
  };
  const res = { headersSent: options.headersSent ?? false };
  const adapter = {
    reply: vi.fn(),
    setHeader: vi.fn(),
    getRequestUrl: vi.fn(() => url),
    getRequestMethod: vi.fn(() => req.method),
    isHeadersSent: vi.fn(() => res.headersSent),
  };
  const host = {
    getType: () => options.hostType ?? 'http',
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;
  const filter = new ProblemDetailsExceptionFilter(
    { httpAdapter: adapter } as unknown as HttpAdapterHost,
    options.table,
  );
  return { filter, host, adapter, res };
}

function replied(adapter: Setup['adapter']) {
  expect(adapter.reply).toHaveBeenCalledTimes(1);
  const [, body, status] = adapter.reply.mock.calls[0] as [
    unknown,
    Record<string, unknown>,
    number,
  ];
  return { body, status };
}

describe('ProblemDetailsExceptionFilter', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  let debug: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('traduit une erreur de validation en 400 VALIDATION_FAILED avec errors[]', () => {
    const { filter, host, adapter } = setup();
    const child = new ValidationError();
    child.property = 'city';
    child.constraints = { isString: 'city must be a string' };
    const parent = new ValidationError();
    parent.property = 'address';
    parent.children = [child];
    const name = new ValidationError();
    name.property = 'name';
    name.constraints = { isNotEmpty: 'name should not be empty' };

    filter.catch(validationExceptionFactory([name, parent]), host);

    const { body, status } = replied(adapter);
    expect(status).toBe(400);
    expect(body).toMatchObject({
      type: 'urn:sport-hub:problem:validation-failed',
      title: 'Bad Request',
      status: 400,
      code: 'VALIDATION_FAILED',
      detail: 'La requête contient 2 erreur(s) de validation.',
      instance: '/api/workouts/42',
      errors: [
        {
          field: 'name',
          code: 'IS_NOT_EMPTY',
          message: 'name should not be empty',
        },
        {
          field: 'address.city',
          code: 'IS_STRING',
          message: 'city must be a string',
        },
      ],
    });
  });

  it('pose le Content-Type problem+json et le header X-Correlation-Id', () => {
    const { filter, host, adapter } = setup();

    runWithCorrelationId('corr-1', () =>
      filter.catch(new NotFoundException(), host),
    );

    expect(adapter.setHeader).toHaveBeenCalledWith(
      expect.anything(),
      'Content-Type',
      PROBLEM_JSON_CONTENT_TYPE,
    );
    expect(adapter.setHeader).toHaveBeenCalledWith(
      expect.anything(),
      'X-Correlation-Id',
      'corr-1',
    );
    expect(PROBLEM_JSON_CONTENT_TYPE).toBe('application/problem+json');
  });

  it('reprend le statut de la table injectée pour une DomainError mappée', () => {
    const { filter, host, adapter } = setup({
      table: { WORKOUT_NOT_FOUND: 404 },
    });

    filter.catch(new WorkoutNotFoundError('42'), host);

    const { body, status } = replied(adapter);
    expect(status).toBe(404);
    expect(body).toMatchObject({
      type: 'urn:sport-hub:problem:workout-not-found',
      title: 'Not Found',
      status: 404,
      code: 'WORKOUT_NOT_FOUND',
      detail: 'Workout 42 not found',
    });
    expect(body).not.toHaveProperty('errors');
    expect(warn).not.toHaveBeenCalled();
  });

  it('répond 422 et logue un warn pour une DomainError non mappée', () => {
    const { filter, host, adapter } = setup({ table: {} });

    runWithCorrelationId('corr-warn', () =>
      filter.catch(new UnmappedError(), host),
    );

    const { body, status } = replied(adapter);
    expect(status).toBe(422);
    expect(body).toMatchObject({
      title: 'Unprocessable Entity',
      code: 'SOMETHING_UNMAPPED',
      detail: 'Règle métier non mappée',
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain('SOMETHING_UNMAPPED');
    expect(logged).toContain('corr-warn');
  });

  describe('codes de DomainError collisionnant avec Object.prototype', () => {
    it.each([['constructor'], ['toString']])(
      'répond 422 + warn pour le code %s (table par défaut)',
      (code) => {
        const { filter, host, adapter } = setup();

        filter.catch(new PrototypeKeyError(code), host);

        const { body, status } = replied(adapter);
        expect(status).toBe(422);
        expect(typeof status).toBe('number');
        expect(body.code).toBe(code);
        expect(warn).toHaveBeenCalledTimes(1);
      },
    );

    it.each([['constructor'], ['toString']])(
      'répond 422 + warn pour le code %s (table injectée sans cette clé)',
      (code) => {
        const { filter, host, adapter } = setup({
          table: { WORKOUT_NOT_FOUND: 404 },
        });

        filter.catch(new PrototypeKeyError(code), host);

        const { status } = replied(adapter);
        expect(status).toBe(422);
        expect(typeof status).toBe('number');
        expect(warn).toHaveBeenCalledTimes(1);
      },
    );

    it('conserve le statut d un code explicitement mappé, même nommé comme une clé du prototype', () => {
      const { filter, host, adapter } = setup({
        table: { constructor: 409, toString: 410 },
      });

      filter.catch(new PrototypeKeyError('constructor'), host);
      filter.catch(new PrototypeKeyError('toString'), host);

      expect(adapter.reply.mock.calls.map((c) => c[2])).toEqual([409, 410]);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('assainissement du message loggé', () => {
    it('logue sur une seule ligne, tronqué à 500 caractères, sans changer la réponse', () => {
      const { filter, host, adapter } = setup();
      const message = `ligne1\r\nligne2\n${'y'.repeat(600)}`;
      expect(message.length).toBeGreaterThan(500);

      filter.catch(new Error(message), host);

      expect(error).toHaveBeenCalledTimes(1);
      const line = String((error.mock.calls[0] as unknown[])[0]);
      expect(line).not.toMatch(/[\r\n]/);
      expect(line).toContain('ligne1 ligne2 y');
      const loggedMessage = line.slice(line.indexOf(' : ') + 3);
      expect(loggedMessage).toHaveLength(500);

      const { body, status } = replied(adapter);
      expect(status).toBe(500);
      expect(body.detail).toBe('Une erreur interne est survenue.');
      expect(JSON.stringify(body)).not.toContain('ligne1');
    });
  });

  describe('plafond des erreurs de validation', () => {
    const items = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        field: `f${i}`,
        code: 'IS_STRING',
        message: 'm',
      }));

    it('annonce le total et la troncature quand totalErrors dépasse errors', () => {
      const { filter, host, adapter } = setup();

      filter.catch(new RequestValidationException(items(100), 150), host);

      const { body, status } = replied(adapter);
      expect(status).toBe(400);
      expect(body.errors).toHaveLength(100);
      expect(body.detail).toBe(
        'La requête contient 150 erreur(s) de validation. La liste est tronquée à 100 erreurs.',
      );
    });

    it('ne mentionne aucune troncature à 100 erreurs ou moins', () => {
      const { filter, host, adapter } = setup();

      filter.catch(new RequestValidationException(items(100)), host);

      const { body } = replied(adapter);
      expect(body.errors).toHaveLength(100);
      expect(body.detail).toBe(
        'La requête contient 100 erreur(s) de validation.',
      );
      expect(body.detail).not.toContain('tronquée');
    });

    it('plafonne via validationExceptionFactory au-delà de 100 erreurs', () => {
      const { filter, host, adapter } = setup();
      const errors = Array.from({ length: 130 }, (_, i) => {
        const e = new ValidationError();
        e.property = `f${i}`;
        e.constraints = { isString: 'x' };
        return e;
      });

      filter.catch(validationExceptionFactory(errors), host);

      const { body } = replied(adapter);
      expect(body.errors).toHaveLength(100);
      expect(body.detail).toContain('130 erreur(s)');
      expect(body.detail).toContain('La liste est tronquée à 100 erreurs.');
    });
  });

  describe('DependencyUnavailableException', () => {
    it('répond 503 SERVICE_UNAVAILABLE avec les checks et un detail fixe', () => {
      const { filter, host, adapter } = setup({ url: '/api/health' });

      runWithCorrelationId('corr-503', () =>
        filter.catch(
          new DependencyUnavailableException({ database: 'down' }),
          host,
        ),
      );

      const { body, status } = replied(adapter);
      expect(status).toBe(503);
      expect(body).toMatchObject({
        type: 'urn:sport-hub:problem:service-unavailable',
        title: 'Service Unavailable',
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        instance: '/api/health',
        correlationId: 'corr-503',
        checks: { database: 'down' },
      });
      expect(typeof body.detail).toBe('string');
      expect(body.detail).not.toBe('Une erreur interne est survenue.');
      expect(body).not.toHaveProperty('errors');
      expect(adapter.setHeader).toHaveBeenCalledWith(
        expect.anything(),
        'Content-Type',
        PROBLEM_JSON_CONTENT_TYPE,
      );
      expect(adapter.setHeader).toHaveBeenCalledWith(
        expect.anything(),
        'X-Correlation-Id',
        'corr-503',
      );
    });

    it('logue en error (statut >= 500)', () => {
      const { filter, host } = setup();

      filter.catch(
        new DependencyUnavailableException({ database: 'down' }),
        host,
      );

      expect(error).toHaveBeenCalled();
    });

    it('n ajoute pas checks aux autres erreurs 5xx', () => {
      const { filter, host, adapter } = setup();

      filter.catch(new HttpException('maintenance', 503), host);

      const { body } = replied(adapter);
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body).not.toHaveProperty('checks');
    });

    it('n ajoute pas checks à une erreur inconnue', () => {
      const { filter, host, adapter } = setup();

      filter.catch(new Error('x'), host);

      expect(replied(adapter).body).not.toHaveProperty('checks');
    });
  });

  it('traduit NotFoundException (route inconnue) en 404 NOT_FOUND', () => {
    const { filter, host, adapter } = setup({ url: '/api/inconnue?x=1' });

    filter.catch(new NotFoundException('Cannot GET /api/inconnue'), host);

    const { body, status } = replied(adapter);
    expect(status).toBe(404);
    expect(body).toMatchObject({
      type: 'urn:sport-hub:problem:not-found',
      title: 'Not Found',
      code: 'NOT_FOUND',
      instance: '/api/inconnue',
      detail: 'Cannot GET /api/inconnue',
    });
  });

  it('traduit BadRequestException en 400 BAD_REQUEST avec son message', () => {
    const { filter, host, adapter } = setup();

    filter.catch(
      new BadRequestException('Validation failed (numeric string is expected)'),
      host,
    );

    const { body, status } = replied(adapter);
    expect(status).toBe(400);
    expect(body).toMatchObject({
      code: 'BAD_REQUEST',
      detail: 'Validation failed (numeric string is expected)',
    });
    expect(body).not.toHaveProperty('errors');
  });

  it('traduit un autre 4xx en CLIENT_ERROR avec son message', () => {
    const { filter, host, adapter } = setup();

    filter.catch(new ForbiddenException('Interdit'), host);

    const { body, status } = replied(adapter);
    expect(status).toBe(403);
    expect(body).toMatchObject({
      title: 'Forbidden',
      code: 'CLIENT_ERROR',
      detail: 'Interdit',
    });
  });

  it('traduit un 413 HttpException en PAYLOAD_TOO_LARGE', () => {
    const { filter, host, adapter } = setup();

    filter.catch(new HttpException('Too big', 413), host);

    const { body, status } = replied(adapter);
    expect(status).toBe(413);
    expect(body).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });

  it('logue un 4xx en debug, sans stack ni error', () => {
    const { filter, host } = setup();

    filter.catch(new NotFoundException(), host);

    expect(debug).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it.each([
    [
      'InternalServerErrorException',
      new InternalServerErrorException('db password=xyz'),
    ],
    ['BadGatewayException', new BadGatewayException('upstream secret-host')],
    ['HttpException 503', new HttpException('maintenance interne', 503)],
  ])(
    'masque le message d un 5xx (%s) avec un detail générique',
    (_n, exception) => {
      const { filter, host, adapter } = setup();

      filter.catch(exception, host);

      const { body, status } = replied(adapter);
      expect(status).toBe(exception.getStatus());
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body.detail).toBe('Une erreur interne est survenue.');
      expect(JSON.stringify(body)).not.toMatch(
        /password|secret-host|maintenance/,
      );
      expect(error).toHaveBeenCalled();
    },
  );

  it.each([
    ['entity.parse.failed', 400, 'MALFORMED_REQUEST_BODY', 400],
    ['entity.too.large', 413, 'PAYLOAD_TOO_LARGE', 413],
  ])(
    'traduit une erreur body-parser %s',
    (type, bodyParserStatus, code, expected) => {
      const { filter, host, adapter } = setup();
      const bodyParserError = Object.assign(
        new SyntaxError(
          'Unexpected token } in JSON at position 12 : {"pwd":"x"}',
        ),
        { type, status: bodyParserStatus, statusCode: bodyParserStatus },
      );

      filter.catch(bodyParserError, host);

      const { body, status } = replied(adapter);
      expect(status).toBe(expected);
      expect(body.code).toBe(code);
      expect(typeof body.detail).toBe('string');
      expect(body.detail).not.toContain('pwd');
      expect(body.detail).not.toContain('Unexpected token');
    },
  );

  describe('erreurs body-parser converties par Nest (mapException)', () => {
    it('traduit une HttpException 413 portant cause entity.too.large', () => {
      const { filter, host, adapter } = setup({ method: 'POST' });
      const exception = new HttpException('request entity too large', 413, {
        cause: { type: 'entity.too.large', status: 413 },
      });

      filter.catch(exception, host);

      const { body, status } = replied(adapter);
      expect(status).toBe(413);
      expect(body.code).toBe('PAYLOAD_TOO_LARGE');
      expect(body.detail).toBe('Le corps de la requête est trop volumineux.');
    });

    it('traduit une HttpException 400 portant cause entity.parse.failed', () => {
      const { filter, host, adapter } = setup({ method: 'POST' });
      const exception = new HttpException('Unexpected token', 400, {
        cause: { type: 'entity.parse.failed', status: 400 },
      });

      filter.catch(exception, host);

      const { body, status } = replied(adapter);
      expect(status).toBe(400);
      expect(body.code).toBe('MALFORMED_REQUEST_BODY');
      expect(body.detail).toBe('Le corps de la requête est invalide.');
    });

    describe('JSON invalide sans cause (heuristique)', () => {
      const parseMessage =
        'Expected double-quoted property name in JSON at position 14 : {"pwd":"x",}';

      function setupWithBody(
        headers: Record<string, string>,
        reqBody?: unknown,
      ): Setup {
        const s = setup({ method: 'POST', headers });
        const req = s.host.switchToHttp().getRequest<{ body?: unknown }>();
        req.body = reqBody;
        return s;
      }

      it('reconnaît un corps JSON non parsé (body undefined, content-length > 0)', () => {
        const { filter, host, adapter } = setupWithBody({
          'content-type': 'application/json',
          'content-length': '15',
        });

        filter.catch(new BadRequestException(parseMessage), host);

        const { body, status } = replied(adapter);
        expect(status).toBe(400);
        expect(body.code).toBe('MALFORMED_REQUEST_BODY');
        expect(body.detail).toBe('Le corps de la requête est invalide.');
        const serialized = JSON.stringify(body);
        expect(serialized).not.toContain('position');
        expect(serialized).not.toContain('pwd');
      });

      it('reconnaît un corps chunked (transfer-encoding sans content-length)', () => {
        const { filter, host, adapter } = setupWithBody({
          'content-type': 'application/json',
          'transfer-encoding': 'chunked',
        });

        filter.catch(new BadRequestException(parseMessage), host);

        const { body, status } = replied(adapter);
        expect(status).toBe(400);
        expect(body.code).toBe('MALFORMED_REQUEST_BODY');
      });

      it.each([
        [
          'body défini (erreur de pipe après parsing)',
          { 'content-type': 'application/json', 'content-length': '2' },
          {},
        ],
        [
          'content-type non JSON',
          { 'content-type': 'text/plain', 'content-length': '15' },
          undefined,
        ],
        ['content-type absent', { 'content-length': '15' }, undefined],
        [
          'content-length 0 sans transfer-encoding',
          { 'content-type': 'application/json', 'content-length': '0' },
          undefined,
        ],
        [
          'content-length absent sans transfer-encoding',
          { 'content-type': 'application/json' },
          undefined,
        ],
      ])('reste BAD_REQUEST : %s', (_n, headers, reqBody) => {
        const { filter, host, adapter } = setupWithBody(headers, reqBody);

        filter.catch(new BadRequestException('Message de pipe'), host);

        const { body, status } = replied(adapter);
        expect(status).toBe(400);
        expect(body.code).toBe('BAD_REQUEST');
        expect(body.detail).toBe('Message de pipe');
      });

      it('reste BAD_REQUEST si la BadRequestException porte une cause', () => {
        const { filter, host, adapter } = setupWithBody({
          'content-type': 'application/json',
          'content-length': '15',
        });

        filter.catch(
          new BadRequestException('Autre', { cause: new Error('x') }),
          host,
        );

        expect(replied(adapter).body.code).toBe('BAD_REQUEST');
      });
    });
  });

  it('répond 500 sans fuite pour une erreur inconnue et logue la stack avec le correlationId', () => {
    const { filter, host, adapter } = setup({ method: 'POST' });
    const boom = new Error('secret interne');

    runWithCorrelationId('corr-500', () => filter.catch(boom, host));

    const { body, status } = replied(adapter);
    expect(status).toBe(500);
    expect(body).toMatchObject({
      type: 'urn:sport-hub:problem:internal-error',
      title: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      detail: 'Une erreur interne est survenue.',
      correlationId: 'corr-500',
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('secret interne');
    expect(serialized).not.toContain('at ');
    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('errors');

    expect(error).toHaveBeenCalled();
    const args = error.mock.calls[0] as unknown[];
    const logged = args.map(String).join('\n');
    expect(logged).toContain('corr-500');
    expect(logged).toContain('POST');
    expect(logged).toContain('/api/workouts/42');
    expect(logged).toContain('secret interne');
    expect(args).toContain(boom.stack);
  });

  it('gère une valeur levée qui n est pas une Error (string)', () => {
    const { filter, host, adapter } = setup();

    filter.catch('texte brut secret', host);

    const { body, status } = replied(adapter);
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('texte brut secret');
  });

  it('utilise le correlationId du contexte dans le corps', () => {
    const { filter, host, adapter } = setup();

    runWithCorrelationId('ctx-id', () =>
      filter.catch(new NotFoundException(), host),
    );

    expect(replied(adapter).body.correlationId).toBe('ctx-id');
  });

  it('se rabat sur le header de la requête si aucun contexte n existe', () => {
    const { filter, host, adapter } = setup({
      headers: { 'x-correlation-id': 'from-header' },
    });

    filter.catch(new NotFoundException(), host);

    expect(replied(adapter).body.correlationId).toBe('from-header');
  });

  it('génère un UUID si ni contexte ni header valide', () => {
    const { filter, host, adapter } = setup({
      headers: { 'x-correlation-id': 'invalide\nvaleur' },
    });

    filter.catch(new NotFoundException(), host);

    expect(replied(adapter).body.correlationId).toMatch(UUID_REGEX);
  });

  it('ne répond pas et logue si les headers sont déjà envoyés', () => {
    const { filter, host, adapter } = setup({ headersSent: true });

    expect(() => filter.catch(new Error('tard'), host)).not.toThrow();

    expect(adapter.reply).not.toHaveBeenCalled();
    expect(adapter.setHeader).not.toHaveBeenCalled();
    expect(error.mock.calls.length + warn.mock.calls.length).toBeGreaterThan(0);
  });

  it('relance l exception pour un contexte non HTTP', () => {
    const { filter, host, adapter } = setup({ hostType: 'rpc' });
    const exception = new Error('cron');

    expect(() => filter.catch(exception, host)).toThrow(exception);
    expect(adapter.reply).not.toHaveBeenCalled();
  });
});
