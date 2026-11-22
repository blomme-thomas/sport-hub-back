import { DomainError } from '../../../../shared/domain/domain-error.js';

export class GarminAccessDeniedError extends DomainError {
  readonly code = 'GARMIN_ACCESS_DENIED';

  constructor() {
    super(
      "L'accès à Garmin a été refusé : vérifiez la clé de l'API Garmin Personal.",
    );
  }
}
