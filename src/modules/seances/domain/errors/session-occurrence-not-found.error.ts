import { DomainError } from '../../../../shared/domain/domain-error.js';

export class SessionOccurrenceNotFoundError extends DomainError {
  readonly code = 'SESSION_OCCURRENCE_NOT_FOUND';

  constructor() {
    super('Aucune occurrence de cette séance à cette date.');
  }
}
