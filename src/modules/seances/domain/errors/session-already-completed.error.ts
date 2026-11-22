import { DomainError } from '../../../../shared/domain/domain-error.js';

export class SessionAlreadyCompletedError extends DomainError {
  readonly code = 'SESSION_ALREADY_COMPLETED';

  constructor() {
    super('Une séance réalisée ne peut plus être modifiée.');
  }
}
