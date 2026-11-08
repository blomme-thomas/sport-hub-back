import {
  DashboardPeriodWindow,
  isDashboardPeriod,
} from './dashboard-period.vo.js';

describe('DashboardPeriodWindow', () => {
  it('termine la période courante à la fin du jour UTC de now et la précédente où la courante commence', () => {
    const window = DashboardPeriodWindow.resolve(
      '7d',
      new Date('2026-11-08T15:30:00.000Z'),
    );

    expect(window.current.toExclusive.toISOString()).toBe(
      '2026-11-09T00:00:00.000Z',
    );
    expect(window.current.from.toISOString()).toBe('2026-11-02T00:00:00.000Z');
    expect(window.previous.toExclusive.toISOString()).toBe(
      '2026-11-02T00:00:00.000Z',
    );
    expect(window.previous.from.toISOString()).toBe('2026-10-26T00:00:00.000Z');
  });

  it('recule de mois calendaires pour 3 mois et 1 an', () => {
    const now = new Date('2026-11-08T10:00:00.000Z');

    const threeMonths = DashboardPeriodWindow.resolve('3m', now);
    expect(threeMonths.current.from.toISOString()).toBe(
      '2026-08-09T00:00:00.000Z',
    );
    expect(threeMonths.previous.from.toISOString()).toBe(
      '2026-05-09T00:00:00.000Z',
    );

    const oneYear = DashboardPeriodWindow.resolve('1y', now);
    expect(oneYear.current.from.toISOString()).toBe('2025-11-09T00:00:00.000Z');
  });

  it("ramène le jour au dernier jour du mois cible quand il n'existe pas", () => {
    const window = DashboardPeriodWindow.resolve(
      '3m',
      new Date('2026-05-30T12:00:00.000Z'),
    );

    expect(window.current.from.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });
});

describe('isDashboardPeriod', () => {
  it.each(['7d', '30d', '3m', '1y'])('accepte %s', (value) => {
    expect(isDashboardPeriod(value)).toBe(true);
  });

  it.each(['7D', '90d', '1m', '', undefined, 7])('refuse %s', (value) => {
    expect(isDashboardPeriod(value)).toBe(false);
  });
});
