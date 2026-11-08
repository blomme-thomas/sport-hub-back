import { DomainError } from '../../../../shared/domain/domain-error.js';

export class PauseInvalidError extends DomainError {
  readonly code = 'PAUSE_INVALID';

  constructor(reason: string) {
    super(`Pause invalide : ${reason}.`);
  }
}
