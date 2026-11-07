import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetTrainingStatsRequestDto } from './get-training-stats.request.dto.js';

const VALID = { granularity: 'week', from: '2026-05-01', to: '2026-05-31' };

async function failures(
  plain: Record<string, unknown>,
): Promise<Record<string, string[]>> {
  const errors = await validate(
    plainToInstance(GetTrainingStatsRequestDto, plain),
  );
  return Object.fromEntries(
    errors.map((error) => [
      error.property,
      Object.keys(error.constraints ?? {}),
    ]),
  );
}

describe('GetTrainingStatsRequestDto', () => {
  it('accepte une requête complète et valide', async () => {
    expect(await failures(VALID)).toEqual({});
  });

  it('accepte un type absent', async () => {
    expect(await failures({ ...VALID, type: undefined })).toEqual({});
  });

  it('accepte une plage réduite à un seul jour', async () => {
    expect(await failures({ ...VALID, to: '2026-05-01' })).toEqual({});
  });

  it('accepte le mois comme granularité', async () => {
    expect(await failures({ ...VALID, granularity: 'month' })).toEqual({});
  });

  it.each([
    ['day', 'day'],
    ['absente', undefined],
    ['en majuscules', 'WEEK'],
  ])(
    'refuse la granularité %s avec IS_IN sur granularity',
    async (_label, value) => {
      expect(await failures({ ...VALID, granularity: value })).toEqual({
        granularity: ['isIn'],
      });
    },
  );

  it.each([
    ['absente', undefined],
    ['mal formée', '2026/05/01'],
    ['sans zéros de tête', '2026-5-1'],
    ['avec heure', '2026-05-01T00:00:00.000Z'],
    ['date impossible', '2026-02-30'],
    ['mois inexistant', '2026-13-01'],
    ['texte', 'abc'],
    ['nombre', 20260501],
  ])('refuse from %s avec IS_CALENDAR_DATE', async (_label, value) => {
    expect(await failures({ ...VALID, from: value })).toEqual({
      from: ['isCalendarDate'],
    });
  });

  it.each([
    ['absente', undefined],
    ['date impossible', '2026-04-31'],
    ['texte', 'demain'],
  ])('refuse to %s avec IS_CALENDAR_DATE', async (_label, value) => {
    expect(await failures({ ...VALID, to: value })).toEqual({
      to: ['isCalendarDate'],
    });
  });

  it('accepte un 29 février d année bissextile et une année 0001', async () => {
    expect(
      await failures({ ...VALID, from: '2028-02-29', to: '2028-03-01' }),
    ).toEqual({});
    expect(
      await failures({ ...VALID, from: '0001-01-01', to: '0001-01-02' }),
    ).toEqual({});
  });

  it('refuse to antérieur à from avec IS_NOT_BEFORE_FROM sur to', async () => {
    expect(
      await failures({ ...VALID, from: '2026-05-31', to: '2026-05-01' }),
    ).toEqual({ to: ['isNotBeforeFrom'] });
  });

  it('ne signale pas IS_NOT_BEFORE_FROM quand une des deux dates est mal formée', async () => {
    const result = await failures({ ...VALID, from: 'abc', to: '2026-05-01' });

    expect(result).toEqual({ from: ['isCalendarDate'] });
  });

  it('retire les espaces en bordure du type', async () => {
    const dto = plainToInstance(GetTrainingStatsRequestDto, {
      ...VALID,
      type: '  running  ',
    });

    expect(dto.type).toBe('running');
    expect(await failures({ ...VALID, type: '  running  ' })).toEqual({});
  });

  it('refuse un type vide ou blanc avec IS_NOT_EMPTY', async () => {
    expect(await failures({ ...VALID, type: '' })).toEqual({
      type: ['isNotEmpty'],
    });
    expect(await failures({ ...VALID, type: '   ' })).toEqual({
      type: ['isNotEmpty'],
    });
  });

  it('accepte un type de 64 caractères et refuse 65 avec MAX_LENGTH', async () => {
    expect(await failures({ ...VALID, type: 'a'.repeat(64) })).toEqual({});
    expect(await failures({ ...VALID, type: 'a'.repeat(65) })).toEqual({
      type: ['maxLength'],
    });
  });
});
