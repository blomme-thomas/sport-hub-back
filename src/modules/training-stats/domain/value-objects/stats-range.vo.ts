import { InvalidStatsRangeError } from '../errors/invalid-stats-range.error.js';
import { StatsRangeTooLargeError } from '../errors/stats-range-too-large.error.js';
import { StatsPeriod } from './stats-period.vo.js';
import type { StatsGranularity } from './stats-granularity.vo.js';

const MAX_PERIODS = 104;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface StatsRangeProps {
  from: Date;
  to: Date;
  granularity: StatsGranularity;
}

export interface StatsReadWindow {
  from: Date;
  toExclusive: Date;
}

export class StatsRange {
  private constructor(
    private readonly first: StatsPeriod,
    private readonly last: StatsPeriod,
    private readonly periodCount: number,
  ) {}

  /**
   * Construit une plage de périodes complètes qui intersectent `from` et `to`.
   *
   * @throws {InvalidStatsRangeError} si `from` est postérieur à `to`.
   * @throws {StatsRangeTooLargeError} si la plage dépasse 104 périodes.
   */
  static create({ from, to, granularity }: StatsRangeProps): StatsRange {
    if (from.getTime() > to.getTime()) {
      throw new InvalidStatsRangeError();
    }
    const first = StatsPeriod.containing(from, granularity);
    const last = StatsPeriod.containing(to, granularity);
    const periodCount = StatsRange.countBetween(first, last, granularity);
    if (periodCount > MAX_PERIODS) {
      throw new StatsRangeTooLargeError(MAX_PERIODS);
    }
    return new StatsRange(first, last, periodCount);
  }

  /** Renvoie les périodes de la plage, de la plus ancienne à la plus récente. */
  periods(): StatsPeriod[] {
    const periods: StatsPeriod[] = [];
    let period = this.first;
    for (let index = 0; index < this.periodCount; index++) {
      periods.push(period);
      period = period.next();
    }
    return periods;
  }

  /**
   * Fenêtre de lecture des activités nécessaire au calcul : de la période précédant la première
   * jusqu'à la borne exclusive de la dernière période.
   */
  queryWindow(): StatsReadWindow {
    return {
      from: this.first.previous().start,
      toExclusive: this.last.end,
    };
  }

  private static countBetween(
    first: StatsPeriod,
    last: StatsPeriod,
    granularity: StatsGranularity,
  ): number {
    if (granularity === 'week') {
      return (
        Math.round((last.start.getTime() - first.start.getTime()) / WEEK_MS) + 1
      );
    }
    const months =
      (last.start.getUTCFullYear() - first.start.getUTCFullYear()) * 12 +
      (last.start.getUTCMonth() - first.start.getUTCMonth());
    return months + 1;
  }
}
