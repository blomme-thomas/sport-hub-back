import { DomainError } from '../../../../shared/domain/domain-error.js';

export class SessionActivityNotFoundError extends DomainError {
  readonly code = 'SESSION_ACTIVITY_NOT_FOUND';

  constructor() {
    super('Activité introuvable à la date de cette séance.');
  }
}
