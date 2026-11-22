import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSlotRequestDto } from './create-slot.request.dto.js';

const VALID = {
  type: 'libre',
  date: '2026-05-04',
  startTime: '09:00',
  endTime: '10:00',
};

async function failedConstraints(plain: Record<string, unknown>) {
  const errors = await validate(plainToInstance(CreateSlotRequestDto, plain));
  return errors.map((error) => ({
    property: error.property,
    constraints: Object.keys(error.constraints ?? {}),
  }));
}

describe('CreateSlotRequestDto', () => {
  it('accepte une création minimale ponctuelle', async () => {
    await expect(failedConstraints(VALID)).resolves.toEqual([]);
  });

  it('accepte une récurrence hebdomadaire et un fuseau IANA', async () => {
    await expect(
      failedConstraints({
        ...VALID,
        type: 'occupe',
        recurrence: 'hebdomadaire',
        timeZone: 'America/New_York',
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['type hors valeurs', { type: 'autre' }, 'type', 'isIn'],
    ['type absent', { type: undefined }, 'type', 'isIn'],
    [
      'récurrence hors valeurs',
      { recurrence: 'mensuelle' },
      'recurrence',
      'isIn',
    ],
    ['récurrence nulle', { recurrence: null }, 'recurrence', 'isIn'],
    ['date mal formée', { date: '04/05/2026' }, 'date', 'isCalendarDate'],
    ['date inexistante', { date: '2026-02-30' }, 'date', 'isCalendarDate'],
    [
      'heure sans zéro de tête',
      { startTime: '9:00' },
      'startTime',
      'isSlotTime',
    ],
    ['heure sur 24', { endTime: '24:00' }, 'endTime', 'isSlotTime'],
    [
      'fuseau inconnu',
      { timeZone: 'Mars/Olympus' },
      'timeZone',
      'isIanaTimeZone',
    ],
    ['fuseau nul', { timeZone: null }, 'timeZone', 'isIanaTimeZone'],
    [
      'décalage horaire au lieu d’un fuseau IANA',
      { timeZone: '+02:00' },
      'timeZone',
      'isIanaTimeZone',
    ],
  ])('refuse %s', async (_label, overrides, property, constraint) => {
    const failures = await failedConstraints({ ...VALID, ...overrides });

    expect(failures).toEqual([
      expect.objectContaining({
        property,
        constraints: expect.arrayContaining([constraint]),
      }),
    ]);
  });
});
