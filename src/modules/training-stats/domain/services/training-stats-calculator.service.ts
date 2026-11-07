import type { TrainingActivityFact } from '../ports/outbound/training-activity.read-model.port.js';
import { ActivityVolume } from '../value-objects/activity-volume.vo.js';
import type { StatsPeriod } from '../value-objects/stats-period.vo.js';
import type { StatsRange } from '../value-objects/stats-range.vo.js';
import { VolumeVariation } from '../value-objects/volume-variation.vo.js';

export interface TypeVolume {
  readonly type: string;
  readonly volume: ActivityVolume;
}

export interface TypeVariation {
  readonly type: string;
  readonly variation: VolumeVariation;
}

export interface PreviousPeriodStats {
  readonly period: StatsPeriod;
  readonly totals: ActivityVolume;
  readonly byType: TypeVolume[];
}

export interface PeriodStats {
  readonly period: StatsPeriod;
  readonly totals: ActivityVolume;
  readonly byType: TypeVolume[];
  readonly previous: PreviousPeriodStats;
  readonly variation: {
    readonly totals: VolumeVariation;
    readonly byType: TypeVariation[];
  };
}

export class TrainingStatsCalculator {
  /**
   * Calcule, pour chaque période de la plage, les volumes totaux et par type, la période précédente et la variation.
   * Le filtre `typeFilter` (type exact, `null` pour tous) s'applique à la période courante et à la précédente.
   */
  compute(
    range: StatsRange,
    facts: readonly TrainingActivityFact[],
    typeFilter: string | null,
  ): PeriodStats[] {
    const relevant =
      typeFilter === null
        ? facts
        : facts.filter((fact) => fact.type === typeFilter);

    return range.periods().map((period) => {
      const previousPeriod = period.previous();
      const current = TrainingStatsCalculator.summarize(period, relevant);
      const previous = TrainingStatsCalculator.summarize(
        previousPeriod,
        relevant,
      );
      return {
        period,
        totals: current.totals,
        byType: current.byType,
        previous: {
          period: previousPeriod,
          totals: previous.totals,
          byType: previous.byType,
        },
        variation: {
          totals: VolumeVariation.between(current.totals, previous.totals),
          byType: TrainingStatsCalculator.compareByType(
            current.byType,
            previous.byType,
          ),
        },
      };
    });
  }

  private static summarize(
    period: StatsPeriod,
    facts: readonly TrainingActivityFact[],
  ): { totals: ActivityVolume; byType: TypeVolume[] } {
    const byType = new Map<string, ActivityVolume>();
    let totals = ActivityVolume.ZERO;
    for (const fact of facts) {
      if (!period.contains(fact.startedAt)) {
        continue;
      }
      const volume = ActivityVolume.of({
        count: 1,
        durationSeconds: fact.durationSeconds,
        distanceMeters: fact.distanceMeters,
      });
      totals = totals.plus(volume);
      byType.set(
        fact.type,
        (byType.get(fact.type) ?? ActivityVolume.ZERO).plus(volume),
      );
    }
    const sortedTypes = [...byType.keys()].sort();
    return {
      totals,
      byType: sortedTypes.map((type) => ({
        type,
        volume: byType.get(type) ?? ActivityVolume.ZERO,
      })),
    };
  }

  private static compareByType(
    current: readonly TypeVolume[],
    previous: readonly TypeVolume[],
  ): TypeVariation[] {
    const currentByType = new Map(
      current.map((entry) => [entry.type, entry.volume]),
    );
    const previousByType = new Map(
      previous.map((entry) => [entry.type, entry.volume]),
    );
    const types = [
      ...new Set([...currentByType.keys(), ...previousByType.keys()]),
    ].sort();
    return types.map((type) => ({
      type,
      variation: VolumeVariation.between(
        currentByType.get(type) ?? ActivityVolume.ZERO,
        previousByType.get(type) ?? ActivityVolume.ZERO,
      ),
    }));
  }
}
