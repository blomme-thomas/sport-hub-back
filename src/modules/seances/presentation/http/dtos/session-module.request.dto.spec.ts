import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SessionModuleRequestDto } from './session-module.request.dto.js';

const VALID = {
  type: 'series',
  durationMinutes: 20,
  instruction: '4 x 100 m',
};

async function failedProperties(plain: Record<string, unknown>) {
  const errors = await validate(
    plainToInstance(SessionModuleRequestDto, plain),
  );
  return errors.map((error) => error.property);
}

describe('SessionModuleRequestDto', () => {
  it('accepte un module minimal', async () => {
    await expect(failedProperties(VALID)).resolves.toEqual([]);
  });

  it('accepte un module avec zones cibles et effort perçu', async () => {
    await expect(
      failedProperties({
        ...VALID,
        targetZones: { heartRate: { min: 140, max: 160 } },
        perceivedEffort: 7,
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['type hors valeurs', { type: 'natation' }, 'type'],
    ['type absent', { type: undefined }, 'type'],
    ['durée nulle', { durationMinutes: 0 }, 'durationMinutes'],
    [
      'durée au-delà de 1440 minutes',
      { durationMinutes: 1441 },
      'durationMinutes',
    ],
    ['durée fractionnaire', { durationMinutes: 12.5 }, 'durationMinutes'],
    ['consigne vide', { instruction: '' }, 'instruction'],
    [
      'consigne de plus de 2000 caractères',
      { instruction: 'a'.repeat(2001) },
      'instruction',
    ],
    ['effort perçu nul', { perceivedEffort: 0 }, 'perceivedEffort'],
    ['effort perçu au-delà de 10', { perceivedEffort: 11 }, 'perceivedEffort'],
    [
      'borne de zone cible nulle',
      { targetZones: { pace: { min: 0, max: 110 } } },
      'targetZones',
    ],
  ])('refuse %s', async (_label, overrides, property) => {
    await expect(failedProperties({ ...VALID, ...overrides })).resolves.toEqual(
      [property],
    );
  });
});
