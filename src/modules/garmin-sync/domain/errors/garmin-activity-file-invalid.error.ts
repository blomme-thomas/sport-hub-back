export class GarminActivityFileInvalidError extends Error {
  readonly code = 'GARMIN_ACTIVITY_FILE_INVALID';

  constructor() {
    super('Le fichier d’activité Garmin est absent ou illisible.');
  }
}
