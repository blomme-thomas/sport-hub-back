import { InvalidSessionError } from '../errors/invalid-session.error.js';
import { SessionId } from './session-id.vo.js';

const SESSION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('SessionId', () => {
  it('génère un identifiant au format UUID', () => {
    expect(SessionId.generate().toString()).toMatch(UUID_PATTERN);
  });

  it('génère un identifiant distinct à chaque appel', () => {
    expect(SessionId.generate().toString()).not.toBe(
      SessionId.generate().toString(),
    );
  });

  it('restitue l’UUID fourni tel quel', () => {
    expect(SessionId.create(SESSION_ID).toString()).toBe(SESSION_ID);
  });

  it('considère comme égaux deux identifiants de même valeur', () => {
    expect(
      SessionId.create(SESSION_ID).equals(SessionId.create(SESSION_ID)),
    ).toBe(true);
  });

  it('considère comme distincts deux identifiants de valeurs différentes', () => {
    expect(SessionId.create(SESSION_ID).equals(SessionId.generate())).toBe(
      false,
    );
  });

  it.each([
    ['chaîne vide', ''],
    ['texte libre', 'seance'],
    ['UUID tronqué', SESSION_ID.slice(0, -1)],
    ['UUID avec un caractère non hexadécimal', SESSION_ID.replace('0', 'z')],
  ])('refuse %s avec SESSION_INVALID', (_label, value) => {
    const error = captureError(() => SessionId.create(value));

    expect(error).toBeInstanceOf(InvalidSessionError);
    expect(error).toMatchObject({ code: 'SESSION_INVALID' });
  });
});
