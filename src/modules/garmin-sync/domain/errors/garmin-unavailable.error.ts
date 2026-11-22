import { DomainError } from '../../../../shared/domain/domain-error.js';

export class GarminUnavailableError extends DomainError {
  readonly code = 'GARMIN_UNAVAILABLE';

  constructor() {
    super('Garmin est momentanément indisponible. Réessayez plus tard.');
  }
}
