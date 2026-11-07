import { isStatsGranularity } from './stats-granularity.vo.js';

describe('isStatsGranularity', () => {
  it.each(['week', 'month'])('accepte la granularité %s', (value) => {
    expect(isStatsGranularity(value)).toBe(true);
  });

  it.each<unknown>([
    'day',
    'year',
    'WEEK',
    'Month',
    '',
    ' week',
    null,
    undefined,
    1,
  ])('refuse la valeur %s', (value) => {
    expect(isStatsGranularity(value)).toBe(false);
  });
});
