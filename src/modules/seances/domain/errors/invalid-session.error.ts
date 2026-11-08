import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidSessionError extends DomainError {
  readonly code = 'SESSION_INVALID';

  constructor(reason: string) {
    super(`Séance invalide : ${reason}.`);
  }
}
