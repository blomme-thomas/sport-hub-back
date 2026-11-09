import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSessionRequestDto } from './create-session.request.dto.js';

const VALID = {
  date: '2026-05-04',
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
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
        equipment: 'Palmes',
        attentionPoints: 'Épaule droite',
        modules: [MODULE, { ...MODULE, type: 'series' }],
      }),
    ).resolves.toEqual([]);
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
      'matériel de plus de 1000 caractères',
      { equipment: 'a'.repeat(1001) },
      'equipment',
    ],
    [
      'points d’attention de plus de 1000 caractères',
      { attentionPoints: 'a'.repeat(1001) },
      'attentionPoints',
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
