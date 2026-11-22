export interface HeartRateZonesDto {
  /** False si l'utilisateur n'a configuré aucune zone : les autres champs sont alors null. */
  readonly available: boolean;
  readonly trainingMethod: string | null;
  readonly maxHeartRateUsed: number | null;
  readonly restingHeartRateUsed: number | null;
  readonly zone1Floor: number | null;
  readonly zone2Floor: number | null;
  readonly zone3Floor: number | null;
  readonly zone4Floor: number | null;
  readonly zone5Floor: number | null;
}
