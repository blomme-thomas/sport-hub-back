import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDisciplineRequestDto } from './update-discipline.request.dto.js';

const LABEL_MAX_LENGTH = 60;

async function failedProperties(plain: Record<string, unknown>) {
  const errors = await validate(
    plainToInstance(UpdateDisciplineRequestDto, plain),
  );
  return errors.map((error) => ({
    property: error.property,
    constraints: Object.keys(error.constraints ?? {}),
  }));
}

describe('UpdateDisciplineRequestDto', () => {
  it.each([
    ['un seul caractère', 'a'],
    ['libellé courant', 'Course à pied'],
    [`${LABEL_MAX_LENGTH} caractères`, 'a'.repeat(LABEL_MAX_LENGTH)],
    ['espaces en bordure', '  Vélo route  '],
  ])('accepte un libellé %s', async (_label, label) => {
    await expect(failedProperties({ label })).resolves.toEqual([]);
  });

  it.each([
    ['libellé absent', {}],
    ['libellé nul', { label: null }],
    ['libellé non textuel', { label: 12 }],
    ['libellé vide', { label: '' }],
    ['libellé composé d’espaces', { label: '   ' }],
    [
      `libellé de plus de ${LABEL_MAX_LENGTH} caractères`,
      { label: 'a'.repeat(LABEL_MAX_LENGTH + 1) },
    ],
  ])('refuse %s', async (_label, plain) => {
    const failures = await failedProperties(plain);

    expect(failures).toEqual([
      expect.objectContaining({
        property: 'label',
        constraints: expect.any(Array),
      }),
    ]);
    expect(failures[0]?.constraints.length).toBeGreaterThan(0);
  });
});
