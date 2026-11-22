import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListSlotsRequestDto } from './list-slots.request.dto.js';

async function failedProperties(plain: Record<string, unknown>) {
  const errors = await validate(plainToInstance(ListSlotsRequestDto, plain));
  return errors.map((error) => error.property);
}

describe('ListSlotsRequestDto', () => {
  it('accepte une période en dates calendaires', async () => {
    await expect(
      failedProperties({ from: '2026-05-01', to: '2026-05-31' }),
    ).resolves.toEqual([]);
  });

  it('refuse une période sans from ni to', async () => {
    await expect(failedProperties({})).resolves.toEqual(['from', 'to']);
  });

  it('refuse une date au format semaine ISO', async () => {
    await expect(
      failedProperties({ from: '2026-W18-1', to: '2026-05-31' }),
    ).resolves.toEqual(['from']);
  });

  it('refuse un jour inexistant dans to', async () => {
    await expect(
      failedProperties({ from: '2026-05-01', to: '2026-02-30' }),
    ).resolves.toEqual(['to']);
  });
});
