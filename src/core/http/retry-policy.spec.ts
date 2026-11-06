import { DEFAULT_HTTP_CLIENT_OPTIONS } from './http-client.types.js';
import { backoffDelayMs, isIdempotent, isRetryable } from './retry-policy.js';

describe('DEFAULT_HTTP_CLIENT_OPTIONS', () => {
  it('fixe un timeout de 10 s, 2 réessais et un backoff de 200 ms à 2 s', () => {
    expect(DEFAULT_HTTP_CLIENT_OPTIONS).toMatchObject({
      timeoutMs: 10_000,
      maxRetries: 2,
      backoffBaseMs: 200,
      backoffMaxMs: 2_000,
    });
  });
});

describe('isIdempotent', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'])(
    'considère %s comme idempotente',
    (method) => {
      expect(isIdempotent(method)).toBe(true);
    },
  );

  it.each(['POST', 'PATCH'])('considère %s comme non idempotente', (method) => {
    expect(isIdempotent(method)).toBe(false);
  });

  it('ignore la casse de la méthode', () => {
    expect(isIdempotent('get')).toBe(true);
    expect(isIdempotent('post')).toBe(false);
  });
});

describe('isRetryable', () => {
  it.each(['TIMEOUT', 'NETWORK'] as const)(
    'réessaie une défaillance %s sur une requête idempotente',
    (failure) => {
      expect(isRetryable('GET', failure)).toBe(true);
    },
  );

  it.each([500, 502, 503, 504, 599])(
    'réessaie un statut %i sur une requête idempotente',
    (status) => {
      expect(isRetryable('GET', 'HTTP_STATUS', status)).toBe(true);
    },
  );

  it.each([400, 401, 403, 404, 409, 422, 429])(
    'ne réessaie jamais un statut 4xx (%i)',
    (status) => {
      expect(isRetryable('GET', 'HTTP_STATUS', status)).toBe(false);
    },
  );

  it.each([301, 302, 304])('ne réessaie pas un statut %i', (status) => {
    expect(isRetryable('GET', 'HTTP_STATUS', status)).toBe(false);
  });

  it.each([
    ['TIMEOUT', undefined],
    ['NETWORK', undefined],
    ['HTTP_STATUS', 503],
  ] as const)(
    'ne réessaie pas une défaillance %s sur une requête non idempotente',
    (failure, status) => {
      expect(isRetryable('POST', failure, status)).toBe(false);
      expect(isRetryable('PATCH', failure, status)).toBe(false);
    },
  );
});

describe('backoffDelayMs', () => {
  const options = { backoffBaseMs: 200, backoffMaxMs: 2_000 };

  it('commence à la base pour le premier réessai', () => {
    expect(backoffDelayMs(1, options)).toBe(200);
  });

  it('double le délai à chaque réessai', () => {
    expect(backoffDelayMs(2, options)).toBe(400);
    expect(backoffDelayMs(3, options)).toBe(800);
    expect(backoffDelayMs(4, options)).toBe(1_600);
  });

  it('plafonne le délai au maximum configuré', () => {
    expect(backoffDelayMs(5, options)).toBe(2_000);
    expect(backoffDelayMs(20, options)).toBe(2_000);
  });

  it('est déterministe, sans jitter', () => {
    expect(backoffDelayMs(3, options)).toBe(backoffDelayMs(3, options));
  });

  it('respecte une base supérieure au plafond en plafonnant', () => {
    expect(
      backoffDelayMs(1, { backoffBaseMs: 5_000, backoffMaxMs: 2_000 }),
    ).toBe(2_000);
  });
});
