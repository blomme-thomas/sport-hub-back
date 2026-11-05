import type { IncomingMessage, ServerResponse } from 'node:http';
import { correlationIdMiddleware } from './correlation-id.middleware.js';
import {
  CORRELATION_ID_HEADER,
  getCorrelationId,
  resolveCorrelationId,
  runWithCorrelationId,
} from './correlation-id.storage.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('resolveCorrelationId', () => {
  it('reprend un header entrant valide', () => {
    expect(resolveCorrelationId('abc-123_DEF.x:y')).toBe('abc-123_DEF.x:y');
  });

  it('accepte 128 caractères', () => {
    const id = 'a'.repeat(128);
    expect(resolveCorrelationId(id)).toBe(id);
  });

  it('génère un UUID si le header est absent', () => {
    expect(resolveCorrelationId(undefined)).toMatch(UUID_REGEX);
  });

  it.each([
    ['vide', ''],
    ['trop long (129)', 'a'.repeat(129)],
    ['avec espace', 'abc def'],
    ['avec saut de ligne (log injection)', 'abc\nINJECTED'],
    ['avec retour chariot', 'abc\rdef'],
    ['avec caractères spéciaux', '<script>'],
    ['avec slash', 'a/b'],
  ])('remplace un header invalide (%s) par un UUID', (_label, value) => {
    const id = resolveCorrelationId(value);
    expect(id).not.toBe(value);
    expect(id).toMatch(UUID_REGEX);
  });

  it('gère un tableau de valeurs en renvoyant un id sûr', () => {
    const id = resolveCorrelationId(['abc', 'def']);
    expect(id).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
  });

  it('génère des UUID distincts à chaque appel', () => {
    expect(resolveCorrelationId(undefined)).not.toBe(
      resolveCorrelationId(undefined),
    );
  });
});

describe('correlation id storage', () => {
  it('expose le header en minuscules', () => {
    expect(CORRELATION_ID_HEADER).toBe('x-correlation-id');
  });

  it('ne renvoie rien hors contexte', () => {
    expect(getCorrelationId()).toBeUndefined();
  });

  it('expose l id dans le contexte et renvoie le résultat de fn', () => {
    const result = runWithCorrelationId('id-1', () => getCorrelationId());
    expect(result).toBe('id-1');
    expect(getCorrelationId()).toBeUndefined();
  });

  it('propage l id à travers les opérations asynchrones', async () => {
    const result = await runWithCorrelationId('id-async', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return getCorrelationId();
    });
    expect(result).toBe('id-async');
  });

  it('isole deux contextes concurrents', async () => {
    const run = (id: string, delay: number) =>
      runWithCorrelationId(id, async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return getCorrelationId();
      });
    const [a, b] = await Promise.all([run('a', 5), run('b', 1)]);
    expect([a, b]).toEqual(['a', 'b']);
  });
});

describe('correlationIdMiddleware', () => {
  const createRes = () => {
    const setHeader = vi.fn();
    return { res: { setHeader } as unknown as ServerResponse, setHeader };
  };
  const createReq = (headers: IncomingMessage['headers']) =>
    ({ headers }) as IncomingMessage;

  it('reprend le header entrant valide, le renvoie et l expose pendant next', () => {
    const { res, setHeader } = createRes();
    let seen: string | undefined;
    const next = vi.fn(() => {
      seen = getCorrelationId();
    });

    correlationIdMiddleware(
      createReq({ 'x-correlation-id': 'req-42' }),
      res,
      next,
    );

    expect(setHeader).toHaveBeenCalledWith('X-Correlation-Id', 'req-42');
    expect(next).toHaveBeenCalledTimes(1);
    expect(seen).toBe('req-42');
  });

  it('génère un UUID sans header entrant', () => {
    const { res, setHeader } = createRes();
    let seen: string | undefined;
    const next = vi.fn(() => {
      seen = getCorrelationId();
    });

    correlationIdMiddleware(createReq({}), res, next);

    const [name, value] = setHeader.mock.calls[0] as [string, string];
    expect(name).toBe('X-Correlation-Id');
    expect(value).toMatch(UUID_REGEX);
    expect(seen).toBe(value);
  });

  it('remplace un header invalide', () => {
    const { res, setHeader } = createRes();
    correlationIdMiddleware(
      createReq({ 'x-correlation-id': 'bad value\nx' }),
      res,
      vi.fn(),
    );
    const [, value] = setHeader.mock.calls[0] as [string, string];
    expect(value).toMatch(UUID_REGEX);
  });

  it('appelle next sans argument', () => {
    const next = vi.fn();
    correlationIdMiddleware(createReq({}), createRes().res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
