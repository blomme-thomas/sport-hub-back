import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SessionIdParamDto } from './session-id.param.dto.js';

async function failedProperties(plain: Record<string, unknown>) {
  const errors = await validate(plainToInstance(SessionIdParamDto, plain));
  return errors.map((error) => error.property);
}

describe('SessionIdParamDto', () => {
  it('accepte un identifiant UUID', async () => {
    await expect(
      failedProperties({ id: '0f8fad5b-d9cb-469f-a165-70867728950e' }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['texte libre', 'seance'],
    ['identifiant vide', ''],
  ])('refuse un identifiant %s', async (_label, id) => {
    await expect(failedProperties({ id })).resolves.toEqual(['id']);
  });
});
