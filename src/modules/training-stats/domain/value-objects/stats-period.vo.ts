import type { StatsGranularity } from './stats-granularity.vo.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export class StatsPeriod {
  readonly end: Date;
  readonly key: string;

  private constructor(
    readonly granularity: StatsGranularity,
    readonly start: Date,
  ) {
    this.end = StatsPeriod.endOf(granularity, start);
    this.key = `${granularity}:${start.toISOString()}`;
  }

  /**
   * Renvoie la période qui contient l'instant : semaine ISO (du lundi 00:00:00.000 UTC au dimanche 23:59:59.999 UTC)
   * ou mois calendaire UTC. La borne `end` de la période est exclusive.
   */
  static containing(instant: Date, granularity: StatsGranularity): StatsPeriod {
    const start = new Date(instant.getTime());
    start.setUTCHours(0, 0, 0, 0);
    if (granularity === 'week') {
      const mondayOffset = (start.getUTCDay() + 6) % 7;
      return new StatsPeriod(
        granularity,
        new Date(start.getTime() - mondayOffset * DAY_MS),
      );
    }
    start.setUTCDate(1);
    return new StatsPeriod(granularity, start);
  }

  previous(): StatsPeriod {
    return this.shift(-1);
  }

  next(): StatsPeriod {
    return this.shift(1);
  }

  contains(instant: Date): boolean {
    return (
      instant.getTime() >= this.start.getTime() &&
      instant.getTime() < this.end.getTime()
    );
  }

  equals(other: StatsPeriod): boolean {
    return (
      this.granularity === other.granularity &&
      this.start.getTime() === other.start.getTime()
    );
  }

  private shift(step: number): StatsPeriod {
    if (this.granularity === 'week') {
      return new StatsPeriod(
        'week',
        new Date(this.start.getTime() + step * WEEK_MS),
      );
    }
    const start = new Date(this.start.getTime());
    start.setUTCMonth(start.getUTCMonth() + step);
    return new StatsPeriod('month', start);
  }

  private static endOf(granularity: StatsGranularity, start: Date): Date {
    if (granularity === 'week') {
      return new Date(start.getTime() + WEEK_MS);
    }
    const end = new Date(start.getTime());
    end.setUTCMonth(end.getUTCMonth() + 1);
    return end;
  }
}
