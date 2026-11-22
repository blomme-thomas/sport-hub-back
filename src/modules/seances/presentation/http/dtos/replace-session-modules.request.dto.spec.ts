import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReplaceSessionModulesRequestDto } from './replace-session-modules.request.dto.js';

const MODULE = {
  type: 'series',
  durationMinutes: 20,
  instruction: '4 x 100 m',
};

async function failedProperties(plain: Record<string, unknown>) {
  const errors = await validate(
    plainToInstance(ReplaceSessionModulesRequestDto, plain),
  );
  return errors.map((error) => error.property);
}

describe('ReplaceSessionModulesRequestDto', () => {
  it('accepte une liste de cinq modules ordonnés', async () => {
    await expect(
      failedProperties({ modules: Array.from({ length: 5 }, () => MODULE) }),
    ).resolves.toEqual([]);
  });

  it('accepte une liste vide', async () => {
    await expect(failedProperties({ modules: [] })).resolves.toEqual([]);
  });

  it('accepte trente modules', async () => {
    await expect(
      failedProperties({ modules: Array.from({ length: 30 }, () => MODULE) }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['liste absente', {}],
    ['liste nulle', { modules: null }],
    ['valeur qui n’est pas une liste', { modules: MODULE }],
    [
      'plus de trente modules',
      { modules: Array.from({ length: 31 }, () => MODULE) },
    ],
    [
      'module au type hors valeurs',
      { modules: [{ ...MODULE, type: 'natation' }] },
    ],
    ['module de durée nulle', { modules: [{ ...MODULE, durationMinutes: 0 }] }],
    ['module sans consigne', { modules: [{ ...MODULE, instruction: '' }] }],
  ])('refuse %s', async (_label, plain) => {
    await expect(failedProperties(plain)).resolves.toEqual(['modules']);
  });
});
