import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSlotRequestDto } from './update-slot.request.dto.js';

async function failedConstraints(plain: Record<string, unknown>) {
  const errors = await validate(plainToInstance(UpdateSlotRequestDto, plain));
  return errors.map((error) => ({
    property: error.property,
    constraints: Object.keys(error.constraints ?? {}),
  }));
}

describe('UpdateSlotRequestDto', () => {
  it('accepte une modification vide', async () => {
    await expect(failedConstraints({})).resolves.toEqual([]);
  });

  it('accepte la modification d’un seul champ', async () => {
    await expect(failedConstraints({ endTime: '11:00' })).resolves.toEqual([]);
  });

  it.each([
    ['type hors valeurs', { type: 'autre' }, 'type', 'isIn'],
    ['type nul', { type: null }, 'type', 'isIn'],
    ['date mal formée', { date: '2026-5-4' }, 'date', 'isCalendarDate'],
    ['heure nulle', { startTime: null }, 'startTime', 'isSlotTime'],
    ['fuseau inconnu', { timeZone: 'Paris' }, 'timeZone', 'isIanaTimeZone'],
  ])('refuse %s', async (_label, plain, property, constraint) => {
    const failures = await failedConstraints(plain);

    expect(failures).toEqual([
      expect.objectContaining({
        property,
        constraints: expect.arrayContaining([constraint]),
      }),
    ]);
  });
});
