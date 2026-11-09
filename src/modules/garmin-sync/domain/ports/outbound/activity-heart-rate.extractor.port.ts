export interface HeartRateSample {
  occurredAt: Date;
  bpm: number;
}

export interface IActivityHeartRateExtractor {
  /**
   * Extrait la série de fréquence cardiaque horodatée du fichier d'origine d'une activité.
   * Les échantillons sans valeur valide sont ignorés.
   *
   * @throws GarminActivityFileInvalidError si le fichier n'est pas une archive contenant un FIT valide.
   */
  extract(file: Uint8Array): HeartRateSample[];
}

export const ACTIVITY_HEART_RATE_EXTRACTOR = Symbol(
  'ACTIVITY_HEART_RATE_EXTRACTOR',
);
