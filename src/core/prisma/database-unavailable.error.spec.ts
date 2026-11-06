import { DomainError } from '../../shared/domain/domain-error.js';
import {
  DatabaseUnavailableError,
  safeErrorCode,
} from './database-unavailable.error.js';

const target = { host: 'db.local', port: 5432, name: 'sporthub' };

describe('DatabaseUnavailableError', () => {
  it('est une erreur technique, pas une DomainError', () => {
    const error = new DatabaseUnavailableError(target);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(DatabaseUnavailableError);
    expect(error.name).toBe('DatabaseUnavailableError');
  });

  it('mentionne host, port et nom de la base', () => {
    const { message } = new DatabaseUnavailableError(target);

    expect(message).toContain('db.local');
    expect(message).toContain('5432');
    expect(message).toContain('sporthub');
  });

  it('ajoute le code de raison quand il est fourni', () => {
    const { message } = new DatabaseUnavailableError(target, 'ECONNREFUSED');

    expect(message).toContain('ECONNREFUSED');
  });

  it('ne porte aucune cause', () => {
    const error = new DatabaseUnavailableError(target, 'ECONNREFUSED');

    expect(error.cause).toBeUndefined();
  });

  it('ne contient ni schéma de connexion, ni utilisateur, ni mot de passe', () => {
    const { message } = new DatabaseUnavailableError(target, 'ECONNREFUSED');

    expect(message).not.toContain('postgresql://');
    expect(message).not.toMatch(/password|@/i);
  });
});

describe('safeErrorCode', () => {
  it('lit le code d une erreur', () => {
    const error = Object.assign(new Error('boom'), { code: 'ECONNREFUSED' });

    expect(safeErrorCode(error)).toBe('ECONNREFUSED');
  });

  it('remonte le code d une cause imbriquée', () => {
    const error = new Error('outer', {
      cause: new Error('mid', {
        cause: Object.assign(new Error('inner'), { code: 'ETIMEDOUT' }),
      }),
    });

    expect(safeErrorCode(error)).toBe('ETIMEDOUT');
  });

  it('privilégie le code de l erreur elle-même', () => {
    const error = Object.assign(
      new Error('outer', {
        cause: Object.assign(new Error('inner'), { code: 'ETIMEDOUT' }),
      }),
      { code: 'P1001' },
    );

    expect(safeErrorCode(error)).toBe('P1001');
  });

  it('s arrête à la profondeur 3', () => {
    const deep = Object.assign(new Error('d3'), { code: 'TOO_DEEP' });
    const error = new Error('d0', {
      cause: new Error('d1', {
        cause: new Error('d2', { cause: deep }),
      }),
    });

    expect(safeErrorCode(error)).toBeUndefined();
  });

  it.each([
    ['contient une URL', 'postgresql://user:pw@host/db'],
    ['contient des espaces', 'connect failed'],
    ['est vide', ''],
    ['dépasse 40 caractères', 'A'.repeat(41)],
    ['contient un saut de ligne', 'ECONN\nREFUSED'],
  ])('ignore un code qui %s', (_n, code) => {
    expect(
      safeErrorCode(Object.assign(new Error('x'), { code })),
    ).toBeUndefined();
  });

  it('accepte un code de 40 caractères', () => {
    const code = 'A'.repeat(40);

    expect(safeErrorCode(Object.assign(new Error('x'), { code }))).toBe(code);
  });

  it('ignore un code qui n est pas une chaîne', () => {
    expect(
      safeErrorCode(Object.assign(new Error('x'), { code: 1234 })),
    ).toBeUndefined();
  });

  it.each([[undefined], [null], ['texte'], [42], [new Error('sans code')]])(
    'renvoie undefined pour %s',
    (value) => {
      expect(safeErrorCode(value)).toBeUndefined();
    },
  );

  it('ne boucle pas sur une cause circulaire', () => {
    const error = new Error('a');
    (error as { cause?: unknown }).cause = error;

    expect(safeErrorCode(error)).toBeUndefined();
  });
});
