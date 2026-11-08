import { DomainError } from '../../../../shared/domain/domain-error.js';

export class ActivityNotFoundError extends DomainError {
  readonly code = 'ACTIVITY_NOT_FOUND';

  constructor() {
    super("L'activité demandée est introuvable.");
  }
}
