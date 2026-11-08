import type { DashboardActivityFact } from '../ports/outbound/training-activity.read-model.port.js';
import type { DashboardWindow } from '../value-objects/dashboard-period.vo.js';

export interface DashboardTotals {
  readonly count: number;
  readonly durationSeconds: number;
  /** Somme des calories des activités qui les renseignent ; null si aucune ne les renseigne. */
  readonly calories: number | null;
  /** Somme du dénivelé positif des activités qui le renseignent ; null si aucune ne le renseigne. */
  readonly elevationGainMeters: number | null;
}

export interface SportBreakdown {
  readonly type: string;
  readonly count: number;
  readonly durationSeconds: number;
}

export interface DailyPoint {
  /** Jour calendaire UTC, format YYYY-MM-DD. */
  readonly date: string;
  readonly count: number;
  readonly durationSeconds: number;
  readonly calories: number | null;
}

export type VariationDirection = 'up' | 'down' | 'flat' | 'unknown';

export interface DashboardVariation {
  readonly direction: VariationDirection;
  /** Écart en pourcentage de la période précédente, arrondi à une décimale ; null si `unknown`. */
  readonly percent: number | null;
}

export interface DashboardStats {
  readonly totals: DashboardTotals;
  /** Moyenne des FC moyennes des activités qui les renseignent ; null si aucune. */
  readonly averageHeartRate: number | null;
  /** Somme par zone cardiaque (zones 1 à 5) ; null pour une zone qu'aucune activité ne renseigne. */
  readonly hrTimeInZone: readonly (number | null)[];
  readonly bySport: readonly SportBreakdown[];
  readonly daily: readonly DailyPoint[];
  /** Variation de la durée totale par rapport à la période précédente de même durée. */
  readonly variation: DashboardVariation;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export class DashboardStatsCalculator {
  /**
   * Calcule les indicateurs d'une période et les compare à la période précédente.
   * Un indicateur absent d'une activité n'est jamais compté comme zéro : sommes et moyennes ne portent que sur les valeurs présentes.
   */
  compute(
    window: DashboardWindow,
    current: readonly DashboardActivityFact[],
    previous: readonly DashboardActivityFact[],
  ): DashboardStats {
    const totals = DashboardStatsCalculator.totalsOf(current);
    return {
      totals,
      averageHeartRate: DashboardStatsCalculator.averageOf(
        current.map((fact) => fact.metrics.averageHeartRate),
      ),
      hrTimeInZone: [0, 1, 2, 3, 4].map((index) =>
        DashboardStatsCalculator.sumOf(
          current.map((fact) => fact.metrics.hrTimeInZone[index] ?? null),
        ),
      ),
      bySport: DashboardStatsCalculator.bySportOf(current),
      daily: DashboardStatsCalculator.dailyOf(window.current, current),
      variation: DashboardStatsCalculator.variationOf(
        totals.durationSeconds,
        previous,
      ),
    };
  }

  private static totalsOf(
    facts: readonly DashboardActivityFact[],
  ): DashboardTotals {
    return {
      count: facts.length,
      durationSeconds: facts.reduce(
        (sum, fact) => sum + fact.durationSeconds,
        0,
      ),
      calories: DashboardStatsCalculator.sumOf(
        facts.map((fact) => fact.metrics.calories),
      ),
      elevationGainMeters: DashboardStatsCalculator.sumOf(
        facts.map((fact) => fact.metrics.elevationGainMeters),
      ),
    };
  }

  private static bySportOf(
    facts: readonly DashboardActivityFact[],
  ): SportBreakdown[] {
    const bySport = new Map<
      string,
      { count: number; durationSeconds: number }
    >();
    for (const fact of facts) {
      const entry = bySport.get(fact.type) ?? { count: 0, durationSeconds: 0 };
      entry.count += 1;
      entry.durationSeconds += fact.durationSeconds;
      bySport.set(fact.type, entry);
    }
    return [...bySport.entries()]
      .map(([type, entry]) => ({ type, ...entry }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }

  private static dailyOf(
    bounds: DashboardWindow['current'],
    facts: readonly DashboardActivityFact[],
  ): DailyPoint[] {
    const days = new Map<string, DashboardActivityFact[]>();
    for (
      let time = bounds.from.getTime();
      time < bounds.toExclusive.getTime();
      time += DAY_MS
    ) {
      days.set(new Date(time).toISOString().slice(0, 10), []);
    }
    for (const fact of facts) {
      days.get(fact.startedAt.toISOString().slice(0, 10))?.push(fact);
    }
    return [...days.entries()].map(([date, dayFacts]) => ({
      date,
      count: dayFacts.length,
      durationSeconds: dayFacts.reduce(
        (sum, fact) => sum + fact.durationSeconds,
        0,
      ),
      calories: DashboardStatsCalculator.sumOf(
        dayFacts.map((fact) => fact.metrics.calories),
      ),
    }));
  }

  private static variationOf(
    currentDuration: number,
    previous: readonly DashboardActivityFact[],
  ): DashboardVariation {
    if (previous.length === 0) {
      return { direction: 'unknown', percent: null };
    }
    const previousDuration = previous.reduce(
      (sum, fact) => sum + fact.durationSeconds,
      0,
    );
    const direction =
      currentDuration > previousDuration
        ? 'up'
        : currentDuration < previousDuration
          ? 'down'
          : 'flat';
    const percent =
      previousDuration === 0
        ? null
        : Math.round(
            ((currentDuration - previousDuration) / previousDuration) * 1000,
          ) / 10;
    return { direction, percent };
  }

  private static sumOf(values: readonly (number | null)[]): number | null {
    const present = values.filter((value): value is number => value !== null);
    if (present.length === 0) {
      return null;
    }
    return present.reduce((sum, value) => sum + value, 0);
  }

  private static averageOf(values: readonly (number | null)[]): number | null {
    const present = values.filter((value): value is number => value !== null);
    if (present.length === 0) {
      return null;
    }
    return present.reduce((sum, value) => sum + value, 0) / present.length;
  }
}
