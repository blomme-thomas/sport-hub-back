import { isDeepStrictEqual } from 'node:util';
import { InvalidActivityError } from '../errors/invalid-activity.error.js';
import type { GarminActivityId } from '../value-objects/garmin-activity-id.vo.js';

export interface ActivityMetrics {
  calories: number | null;
  elevationGainMeters: number | null;
  averageHeartRate: number | null;
  /** Cinq zones cardiaques, de la zone 1 à la zone 5. Unité supposée en secondes, non confirmée par la spec Garmin. */
  hrTimeInZone: readonly (number | null)[];
}

export const EMPTY_ACTIVITY_METRICS: ActivityMetrics = {
  calories: null,
  elevationGainMeters: null,
  averageHeartRate: null,
  hrTimeInZone: [null, null, null, null, null],
};

export interface ActivityProps {
  garminActivityId: GarminActivityId;
  type: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  metrics?: ActivityMetrics;
  sourcePayload: unknown;
}

const isAbsentOrNonNegative = (value: number | null): boolean =>
  value === null || (Number.isFinite(value) && value >= 0);

export class Activity {
  private constructor(private readonly props: ActivityProps) {}

  /**
   * Crée une activité synchronisée en vérifiant ses invariants.
   *
   * @throws InvalidActivityError si le type est vide, la date de début invalide, la durée ou la distance négative ou non finie.
   */
  static create(props: ActivityProps): Activity {
    if (props.type.trim().length === 0) {
      throw new InvalidActivityError("le type d'activité est vide");
    }
    if (Number.isNaN(props.startedAt.getTime())) {
      throw new InvalidActivityError('la date de début est invalide');
    }
    if (!Number.isFinite(props.durationSeconds) || props.durationSeconds < 0) {
      throw new InvalidActivityError(
        'la durée doit être un nombre positif ou nul',
      );
    }
    if (
      props.distanceMeters !== null &&
      (!Number.isFinite(props.distanceMeters) || props.distanceMeters < 0)
    ) {
      throw new InvalidActivityError(
        'la distance doit être un nombre positif ou nul',
      );
    }
    const metrics = props.metrics ?? EMPTY_ACTIVITY_METRICS;
    const metricValues = [
      metrics.calories,
      metrics.elevationGainMeters,
      metrics.averageHeartRate,
      ...metrics.hrTimeInZone,
    ];
    if (
      metrics.hrTimeInZone.length !== 5 ||
      !metricValues.every(isAbsentOrNonNegative)
    ) {
      throw new InvalidActivityError(
        'les indicateurs doivent être absents ou des nombres positifs ou nuls',
      );
    }
    return new Activity({ ...props, metrics });
  }

  static reconstitute(props: ActivityProps): Activity {
    return new Activity({
      ...props,
      metrics: props.metrics ?? EMPTY_ACTIVITY_METRICS,
    });
  }

  get garminActivityId(): GarminActivityId {
    return this.props.garminActivityId;
  }

  get type(): string {
    return this.props.type;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get durationSeconds(): number {
    return this.props.durationSeconds;
  }

  get distanceMeters(): number | null {
    return this.props.distanceMeters;
  }

  get metrics(): ActivityMetrics {
    return this.props.metrics ?? EMPTY_ACTIVITY_METRICS;
  }

  get sourcePayload(): unknown {
    return this.props.sourcePayload;
  }

  /** Indique si l'autre activité porte le même contenu, payload source compris, pour détecter une modification côté Garmin. */
  hasSameContentAs(other: Activity): boolean {
    return (
      this.type === other.type &&
      this.startedAt.getTime() === other.startedAt.getTime() &&
      this.durationSeconds === other.durationSeconds &&
      this.distanceMeters === other.distanceMeters &&
      isDeepStrictEqual(this.sourcePayload, other.sourcePayload)
    );
  }
}
