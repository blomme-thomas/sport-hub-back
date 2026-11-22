import type { ActivityVolume } from './activity-volume.vo.js';

export interface MetricVariation {
  readonly absolute: number;
  readonly percent: number | null;
}

export class VolumeVariation {
  private constructor(
    readonly count: MetricVariation,
    readonly durationSeconds: MetricVariation,
    readonly distanceMeters: MetricVariation,
  ) {}

  /**
   * Écart absolu (courant - précédent) et pourcentage arrondi à une décimale.
   * Le pourcentage vaut `null` quand la période précédente est nulle, car il n'a pas de sens.
   */
  static between(
    current: ActivityVolume,
    previous: ActivityVolume,
  ): VolumeVariation {
    return new VolumeVariation(
      metricVariation(current.count, previous.count),
      metricVariation(current.durationSeconds, previous.durationSeconds),
      metricVariation(current.distanceMeters, previous.distanceMeters),
    );
  }
}

function metricVariation(current: number, previous: number): MetricVariation {
  const absolute = current - previous;
  if (previous === 0) {
    return { absolute, percent: null };
  }
  return { absolute, percent: roundToTenth((absolute / previous) * 100) };
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10 + 0;
}
