import { InvalidDisciplineLabelError } from '../errors/invalid-discipline-label.error.js';
import { DisciplineLabel } from './discipline-label.vo.js';
import { DisciplineTypeKey } from './discipline-type-key.vo.js';

const LABEL_MAX_LENGTH = 60;

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('DisciplineLabel', () => {
  it('restitue le libellé fourni', () => {
    expect(DisciplineLabel.create('Course à pied').toString()).toBe(
      'Course à pied',
    );
  });

  it('retire les espaces en début et en fin de libellé', () => {
    expect(DisciplineLabel.create('  Vélo route  ').toString()).toBe(
      'Vélo route',
    );
  });

  it.each([
    ['un seul caractère', 'a'],
    [`${LABEL_MAX_LENGTH} caractères`, 'a'.repeat(LABEL_MAX_LENGTH)],
  ])('accepte un libellé de %s', (_label, raw) => {
    expect(DisciplineLabel.create(raw).toString()).toBe(raw);
  });

  it(`accepte un libellé de ${LABEL_MAX_LENGTH} caractères une fois les espaces retirés`, () => {
    const raw = ` ${'a'.repeat(LABEL_MAX_LENGTH)} `;

    expect(DisciplineLabel.create(raw).toString()).toBe(
      'a'.repeat(LABEL_MAX_LENGTH),
    );
  });

  it(`refuse un libellé de plus de ${LABEL_MAX_LENGTH} caractères avec DISCIPLINE_LABEL_INVALID`, () => {
    const error = captureError(() =>
      DisciplineLabel.create('a'.repeat(LABEL_MAX_LENGTH + 1)),
    );

    expect(error).toBeInstanceOf(InvalidDisciplineLabelError);
    expect(error).toMatchObject({ code: 'DISCIPLINE_LABEL_INVALID' });
  });

  it.each([
    ['chaîne vide', ''],
    ['espaces seuls', '   '],
  ])('refuse un libellé %s avec DISCIPLINE_LABEL_INVALID', (_label, raw) => {
    const error = captureError(() => DisciplineLabel.create(raw));

    expect(error).toBeInstanceOf(InvalidDisciplineLabelError);
    expect(error).toMatchObject({ code: 'DISCIPLINE_LABEL_INVALID' });
  });

  it('prend la clé de type comme libellé initial', () => {
    const label = DisciplineLabel.fromTypeKey(
      DisciplineTypeKey.create('strength_training'),
    );

    expect(label.toString()).toBe('strength_training');
  });
});
