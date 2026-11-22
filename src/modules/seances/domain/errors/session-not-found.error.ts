import { DomainError } from '../../../../shared/domain/domain-error.js';

export class SessionNotFoundError extends DomainError {
  readonly code = 'SESSION_NOT_FOUND';

  constructor() {
    super('La séance demandée est introuvable.');
  }
}
