import { InvalidDisciplineError } from '../errors/invalid-discipline.error.js';
import { DisciplineTypeKey } from './discipline-type-key.vo.js';

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('DisciplineTypeKey', () => {
  it('restitue la clé fournie', () => {
    expect(DisciplineTypeKey.create('running').toString()).toBe('running');
  });

  it('retire les espaces en début et en fin de clé', () => {
    expect(DisciplineTypeKey.create('  cycling  ').toString()).toBe('cycling');
  });

  it.each([
    ['chaîne vide', ''],
    ['espaces seuls', '   '],
    ['tabulation seule', '\t'],
  ])('refuse une clé %s avec DISCIPLINE_INVALID', (_label, raw) => {
    const error = captureError(() => DisciplineTypeKey.create(raw));

    expect(error).toBeInstanceOf(InvalidDisciplineError);
    expect(error).toMatchObject({ code: 'DISCIPLINE_INVALID' });
  });

  it('accepte une clé de 100 caractères', () => {
    const raw = 'a'.repeat(100);

    expect(DisciplineTypeKey.create(raw).toString()).toBe(raw);
  });

  it('refuse une clé de plus de 100 caractères avec DISCIPLINE_INVALID', () => {
    const error = captureError(() => DisciplineTypeKey.create('a'.repeat(101)));

    expect(error).toBeInstanceOf(InvalidDisciplineError);
    expect(error).toMatchObject({ code: 'DISCIPLINE_INVALID' });
  });
});
