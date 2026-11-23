import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSessionRequestDto } from './create-session.request.dto.js';

const VALID = {
  date: '2026-05-04',
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
  startTime: '18:00',
  targetHrZonePercentages: [10, 20, 40, 20, 10],
};

const MODULE = {
  type: 'educatifs',
  durationMinutes: 10,
  instruction: 'Battements jambes',
};

async function failedProperties(plain: Record<string, unknown>) {
  const errors = await validate(
    plainToInstance(CreateSessionRequestDto, plain),
  );
  return errors.map((error) => error.property);
}

describe('CreateSessionRequestDto', () => {
  it('refuse une création sans heure de début', async () => {
    const { startTime: _omitted, ...withoutTime } = VALID;
    await expect(failedProperties(withoutTime)).resolves.toContain('startTime');
  });

  it('refuse une heure de début nulle', async () => {
    await expect(
      failedProperties({ ...VALID, startTime: null }),
    ).resolves.toContain('startTime');
  });

  it('refuse une création sans répartition par zone', async () => {
    const { targetHrZonePercentages: _omitted, ...withoutZones } = VALID;
    await expect(failedProperties(withoutZones)).resolves.toContain(
      'targetHrZonePercentages',
    );
  });

  it('refuse une répartition qui ne totalise pas 100', async () => {
    await expect(
      failedProperties({
        ...VALID,
        targetHrZonePercentages: [10, 10, 10, 10, 10],
      }),
    ).resolves.toContain('targetHrZonePercentages');
  });

  it('refuse une distance visée nulle', async () => {
    await expect(
      failedProperties({ ...VALID, targetDistanceMeters: 0 }),
    ).resolves.toContain('targetDistanceMeters');
  });

  it('accepte une création minimale', async () => {
    await expect(failedProperties(VALID)).resolves.toEqual([]);
  });

  it('accepte une création complète avec ses modules', async () => {
    await expect(
      failedProperties({
        ...VALID,
        description: 'Séance de fond',
        modules: [MODULE, { ...MODULE, type: 'series' }],
      }),
    ).resolves.toEqual([]);
  });

  it('accepte une création avec glucides, unité et hydratation', async () => {
    await expect(
      failedProperties({
        ...VALID,
        carbsGrams: 60,
        carbsUnit: 'par_heure',
        hydrationMilliliters: 500,
      }),
    ).resolves.toEqual([]);
  });

  it('accepte les bornes de glucides et d’hydratation', async () => {
    await expect(
      failedProperties({
        ...VALID,
        carbsGrams: 1000,
        carbsUnit: 'pour_la_seance',
        hydrationMilliliters: 20000,
      }),
    ).resolves.toEqual([]);
    await expect(
      failedProperties({
        ...VALID,
        carbsGrams: 1,
        carbsUnit: 'par_heure',
        hydrationMilliliters: 1,
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['glucides nuls', { carbsGrams: 0, carbsUnit: 'par_heure' }, 'carbsGrams'],
    [
      'glucides négatifs',
      { carbsGrams: -5, carbsUnit: 'par_heure' },
      'carbsGrams',
    ],
    [
      'glucides décimaux',
      { carbsGrams: 60.5, carbsUnit: 'par_heure' },
      'carbsGrams',
    ],
    [
      'glucides au-delà de 1000',
      { carbsGrams: 1001, carbsUnit: 'par_heure' },
      'carbsGrams',
    ],
    [
      'glucides textuels',
      { carbsGrams: '60', carbsUnit: 'par_heure' },
      'carbsGrams',
    ],
    [
      'unité de glucides inconnue',
      { carbsGrams: 60, carbsUnit: 'par_minute' },
      'carbsUnit',
    ],
    ['hydratation nulle', { hydrationMilliliters: 0 }, 'hydrationMilliliters'],
    [
      'hydratation négative',
      { hydrationMilliliters: -100 },
      'hydrationMilliliters',
    ],
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
  ])('refuse %s', async (_label, overrides, property) => {
    await expect(
      failedProperties({ ...VALID, ...overrides }),
    ).resolves.toContain(property);
  });

  it('accepte trente modules', async () => {
    await expect(
      failedProperties({
        ...VALID,
        modules: Array.from({ length: 30 }, () => MODULE),
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['date mal formée', { date: '04/05/2026' }, 'date'],
    ['date inexistante', { date: '2026-02-30' }, 'date'],
    ['date absente', { date: undefined }, 'date'],
    ['discipline vide', { disciplineTypeKey: '' }, 'disciplineTypeKey'],
    [
      'discipline absente',
      { disciplineTypeKey: undefined },
      'disciplineTypeKey',
    ],
    [
      'discipline de plus de 100 caractères',
      { disciplineTypeKey: 'a'.repeat(101) },
      'disciplineTypeKey',
    ],
    ['durée nulle', { durationMinutes: 0 }, 'durationMinutes'],
    [
      'durée au-delà de 1440 minutes',
      { durationMinutes: 1441 },
      'durationMinutes',
    ],
    ['durée fractionnaire', { durationMinutes: 60.5 }, 'durationMinutes'],
    [
      'description de plus de 2000 caractères',
      { description: 'a'.repeat(2001) },
      'description',
    ],
    [
      'plus de trente modules',
      { modules: Array.from({ length: 31 }, () => MODULE) },
      'modules',
    ],
    [
      'module au type hors valeurs',
      { modules: [{ ...MODULE, type: 'natation' }] },
      'modules',
    ],
    [
      'module de durée nulle',
      { modules: [{ ...MODULE, durationMinutes: 0 }] },
      'modules',
    ],
  ])('refuse %s', async (_label, overrides, property) => {
    await expect(
      failedProperties({ ...VALID, ...overrides }),
    ).resolves.toContain(property);
  });
});
