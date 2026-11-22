import {
  DashboardPeriodWindow,
  isDashboardPeriod,
} from './dashboard-period.vo.js';

describe('DashboardPeriodWindow', () => {
  // 8 novembre 2026 : dimanche, donc la semaine ISO commence le lundi 2 novembre.
  const now = new Date('2026-11-08T15:30:00.000Z');

  it('prend la semaine ISO entière (lundi à dimanche) et la précédente', () => {
    const window = DashboardPeriodWindow.resolve('week', now);

    expect(window.current.from.toISOString()).toBe('2026-11-02T00:00:00.000Z');
    expect(window.current.toExclusive.toISOString()).toBe(
      '2026-11-09T00:00:00.000Z',
    );
    expect(window.previous.from.toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(window.previous.toExclusive.toISOString()).toBe(
      '2026-11-02T00:00:00.000Z',
    );
  });

  it('prend le mois civil entier et le mois précédent', () => {
    const window = DashboardPeriodWindow.resolve('month', now);

    expect(window.current.from.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(window.current.toExclusive.toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
    expect(window.previous.from.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(window.previous.toExclusive.toISOString()).toBe(
      '2026-11-01T00:00:00.000Z',
    );
  });

  it('une semaine qui chevauche deux mois reste une semaine entière', () => {
    // Lundi 30 novembre 2026 : la semaine va jusqu'au 6 décembre.
    const window = DashboardPeriodWindow.resolve(
      'week',
      new Date('2026-11-30T10:00:00.000Z'),
    );

    expect(window.current.from.toISOString()).toBe('2026-11-30T00:00:00.000Z');
    expect(window.current.toExclusive.toISOString()).toBe(
      '2026-12-07T00:00:00.000Z',
    );
  });

  it('le mois précédent de janvier est décembre de l’année précédente', () => {
    const window = DashboardPeriodWindow.resolve(
      'month',
      new Date('2026-01-15T10:00:00.000Z'),
    );

    expect(window.previous.from.toISOString()).toBe('2025-12-01T00:00:00.000Z');
  });
});

describe('isDashboardPeriod', () => {
  it.each(['week', 'month'])('accepte %s', (value) => {
    expect(isDashboardPeriod(value)).toBe(true);
  });

  it.each(['7d', '30d', '3m', '1y', 'WEEK', '', undefined, 7])(
    'refuse %s',
    (value) => {
      expect(isDashboardPeriod(value)).toBe(false);
    },
  );
});
