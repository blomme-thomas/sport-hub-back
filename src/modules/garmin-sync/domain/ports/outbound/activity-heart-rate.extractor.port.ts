export interface HeartRateSample {
  occurredAt: Date;
  bpm: number;
}

/** Document compact d'une activité : messages utiles du FIT, valeurs « non renseigné » retirées. */
export interface ActivityFitDocument {
  formatVersion: number;
  session: Record<string, unknown> | null;
  laps: Record<string, unknown>[];
  timeInZone: Record<string, unknown>[];
  /** Échantillons de fréquence cardiaque : [secondes Unix, bpm]. */
  records: [number, number][];
}

export interface ActivityFitExtraction {
  heartRateSamples: HeartRateSample[];
  document: ActivityFitDocument;
}

export interface IActivityHeartRateExtractor {
  /**
   * Décode le fichier d'origine d'une activité : la série de fréquence cardiaque et le document compact.
   *
   * @throws GarminActivityFileInvalidError si le fichier n'est pas une archive contenant un FIT valide.
   */
  extract(file: Uint8Array): ActivityFitExtraction;
}

export const ACTIVITY_HEART_RATE_EXTRACTOR = Symbol(
  'ACTIVITY_HEART_RATE_EXTRACTOR',
);
