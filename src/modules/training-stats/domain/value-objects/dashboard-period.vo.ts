export const DASHBOARD_PERIODS = ['7d', '30d', '3m', '1y'] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export interface DashboardBounds {
  readonly from: Date;
  readonly toExclusive: Date;
}

export interface DashboardWindow {
  readonly current: DashboardBounds;
  readonly previous: DashboardBounds;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const SHIFT: Record<
  DashboardPeriod,
  { unit: 'day' | 'month'; amount: number }
> = {
  '7d': { unit: 'day', amount: 7 },
  '30d': { unit: 'day', amount: 30 },
  '3m': { unit: 'month', amount: 3 },
  '1y': { unit: 'month', amount: 12 },
};

/**
 * Fenêtres d'un tableau de bord, en UTC. La période courante se termine à la fin du jour `now` (inclus) ;
 * la période précédente a la même durée et se termine où commence la courante.
 */
export class DashboardPeriodWindow {
  static resolve(period: DashboardPeriod, now: Date): DashboardWindow {
    const toExclusive = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) +
        DAY_MS,
    );
    const from = DashboardPeriodWindow.shiftBack(toExclusive, period);
    const previousFrom = DashboardPeriodWindow.shiftBack(from, period);
    return {
      current: { from, toExclusive },
      previous: { from: previousFrom, toExclusive: from },
    };
  }

  private static shiftBack(date: Date, period: DashboardPeriod): Date {
    const { unit, amount } = SHIFT[period];
    if (unit === 'day') {
      return new Date(date.getTime() - amount * DAY_MS);
    }
    const targetMonthIndex =
      date.getUTCFullYear() * 12 + date.getUTCMonth() - amount;
    const year = Math.floor(targetMonthIndex / 12);
    const month = targetMonthIndex - year * 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.min(date.getUTCDate(), lastDay);
    return new Date(
      Date.UTC(year, month, day, date.getUTCHours(), date.getUTCMinutes()),
    );
  }
}

export function isDashboardPeriod(value: unknown): value is DashboardPeriod {
  return (DASHBOARD_PERIODS as readonly unknown[]).includes(value);
}
