import { IsoWeek } from './iso-week.vo.js';

describe('IsoWeek.containing', () => {
  it.each([
    ['2026-11-08T12:00:00.000Z', '2026-W45'],
    ['2026-11-02T00:00:00.000Z', '2026-W45'],
    ['2026-01-01T00:00:00.000Z', '2026-W01'],
    ['2024-12-31T23:00:00.000Z', '2025-W01'],
    ['2027-01-01T00:00:00.000Z', '2026-W53'],
  ])('place %s dans la semaine %s', (instant, label) => {
    expect(IsoWeek.containing(new Date(instant)).label).toBe(label);
  });

  it('renvoie le lundi UTC de la semaine contenant la date', () => {
    expect(
      IsoWeek.containing(
        new Date('2026-11-08T23:59:00.000Z'),
      ).monday.toISOString(),
    ).toBe('2026-11-02T00:00:00.000Z');
  });
});
