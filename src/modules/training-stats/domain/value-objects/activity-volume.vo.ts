export interface ActivityVolumeProps {
  count: number;
  durationSeconds: number;
  distanceMeters: number | null;
}

export class ActivityVolume {
  static readonly ZERO = new ActivityVolume(0, 0, 0);

  private constructor(
    readonly count: number,
    readonly durationSeconds: number,
    readonly distanceMeters: number,
  ) {}

  /** Une distance absente compte pour zéro mètre ; l'activité reste comptée en séance et en durée. */
  static of({
    count,
    durationSeconds,
    distanceMeters,
  }: ActivityVolumeProps): ActivityVolume {
    return new ActivityVolume(count, durationSeconds, distanceMeters ?? 0);
  }

  plus(other: ActivityVolume): ActivityVolume {
    return new ActivityVolume(
      this.count + other.count,
      this.durationSeconds + other.durationSeconds,
      this.distanceMeters + other.distanceMeters,
    );
  }
}
