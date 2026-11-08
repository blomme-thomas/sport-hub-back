import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSessionRequestDto } from './update-session.request.dto.js';

async function failedProperties(plain: Record<string, unknown>) {
  const errors = await validate(
    plainToInstance(UpdateSessionRequestDto, plain),
  );
  return errors.map((error) => error.property);
}

describe('UpdateSessionRequestDto', () => {
  it('accepte une modification vide', async () => {
    await expect(failedProperties({})).resolves.toEqual([]);
  });

  it('accepte la modification d’un seul champ', async () => {
    await expect(failedProperties({ durationMinutes: 45 })).resolves.toEqual(
      [],
    );
  });

  it('accepte une description, un matériel et des points d’attention nuls pour les effacer', async () => {
    await expect(
      failedProperties({
        description: null,
        equipment: null,
        attentionPoints: null,
      }),
    ).resolves.toEqual([]);
  });

  it('accepte un statut de la liste autorisée', async () => {
    await expect(failedProperties({ status: 'manquee' })).resolves.toEqual([]);
  });

  it.each([
    ['date mal formée', { date: '2026-5-4' }, 'date'],
    ['date nulle', { date: null }, 'date'],
    ['discipline vide', { disciplineTypeKey: '' }, 'disciplineTypeKey'],
    ['discipline nulle', { disciplineTypeKey: null }, 'disciplineTypeKey'],
    ['durée nulle', { durationMinutes: 0 }, 'durationMinutes'],
    ['durée fractionnaire', { durationMinutes: 45.5 }, 'durationMinutes'],
    ['durée à null', { durationMinutes: null }, 'durationMinutes'],
    ['statut hors valeurs', { status: 'annulee' }, 'status'],
    ['statut nul', { status: null }, 'status'],
    [
      'description de plus de 2000 caractères',
      { description: 'a'.repeat(2001) },
      'description',
    ],
    [
      'matériel de plus de 1000 caractères',
      { equipment: 'a'.repeat(1001) },
      'equipment',
    ],
  ])('refuse %s', async (_label, plain, property) => {
    await expect(failedProperties(plain)).resolves.toContain(property);
  });
});
