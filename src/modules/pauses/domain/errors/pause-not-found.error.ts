import { DomainError } from '../../../../shared/domain/domain-error.js';

export class PauseNotFoundError extends DomainError {
  readonly code = 'PAUSE_NOT_FOUND';

  constructor() {
    super('La pause demandée est introuvable.');
  }
}
