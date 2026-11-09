import { DomainError } from '../../../../shared/domain/domain-error.js';

export class ActivityFitDataNotFoundError extends DomainError {
  readonly code = 'ACTIVITY_FIT_DATA_NOT_FOUND';

  constructor() {
    super('Aucune donnée FIT n’a été enregistrée pour cette activité.');
  }
}
