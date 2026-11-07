import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidActivityError extends DomainError {
  readonly code = 'ACTIVITY_INVALID';

  constructor(reason: string) {
    super(`Activité invalide : ${reason}.`);
  }
}
