import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidPlannedMealError extends DomainError {
  readonly code = 'INVALID_PLANNED_MEAL';

  constructor(reason: string) {
    super(`Repas planifié invalide : ${reason}.`);
  }
}
