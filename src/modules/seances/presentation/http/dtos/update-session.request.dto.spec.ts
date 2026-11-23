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
      }),
    ).resolves.toEqual([]);
  });

  it('accepte glucides, unité et hydratation renseignés', async () => {
    await expect(
      failedProperties({
        carbsGrams: 60,
        carbsUnit: 'par_heure',
        hydrationMilliliters: 500,
      }),
    ).resolves.toEqual([]);
  });

  it('accepte glucides, unité et hydratation nuls pour les effacer', async () => {
    await expect(
      failedProperties({
        carbsGrams: null,
        carbsUnit: null,
        hydrationMilliliters: null,
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['glucides nuls', { carbsGrams: 0 }, 'carbsGrams'],
    ['glucides négatifs', { carbsGrams: -5 }, 'carbsGrams'],
    ['glucides décimaux', { carbsGrams: 60.5 }, 'carbsGrams'],
    ['glucides au-delà de 1000', { carbsGrams: 1001 }, 'carbsGrams'],
    ['unité de glucides inconnue', { carbsUnit: 'par_minute' }, 'carbsUnit'],
    ['hydratation nulle', { hydrationMilliliters: 0 }, 'hydrationMilliliters'],
    [
      'hydratation décimale',
      { hydrationMilliliters: 500.5 },
      'hydrationMilliliters',
    ],
    [
      'hydratation au-delà de 20000',
      { hydrationMilliliters: 20001 },
      'hydrationMilliliters',
    ],
  ])('refuse %s', async (_label, plain, property) => {
    await expect(failedProperties(plain)).resolves.toContain(property);
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
  ])('refuse %s', async (_label, plain, property) => {
    await expect(failedProperties(plain)).resolves.toContain(property);
  });
});
