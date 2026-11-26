export const DASHBOARD_PERIODS = ['week', 'month'] as const;

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
const WEEK_DAYS = 7;

/**
 * Fenêtres d'un tableau de bord, en UTC : la semaine ISO (lundi à dimanche) ou le mois civil qui contient `now`.
 * La période précédente est de même nature (semaine ou mois) et se termine où la courante commence.
 */
export class DashboardPeriodWindow {
  static resolve(period: DashboardPeriod, now: Date): DashboardWindow {
    const current = boundsOf(period, now);
    const previous = boundsOf(
      period,
      new Date(current.from.getTime() - DAY_MS),
    );
    return { current, previous };
  }
}

function boundsOf(period: DashboardPeriod, date: Date): DashboardBounds {
  return period === 'week' ? weekBounds(date) : monthBounds(date);
}

/** Semaine ISO contenant la date : du lundi (inclus) au lundi suivant (exclu). */
function weekBounds(date: Date): DashboardBounds {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const from = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysSinceMonday,
  );
  return {
    from: new Date(from),
    toExclusive: new Date(from + WEEK_DAYS * DAY_MS),
  };
}

/** Mois civil contenant la date : du 1er (inclus) au 1er du mois suivant (exclu). */
function monthBounds(date: Date): DashboardBounds {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, month, 1)),
    toExclusive: new Date(Date.UTC(year, month + 1, 1)),
  };
}
