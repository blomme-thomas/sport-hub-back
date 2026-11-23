import { DomainError } from '../../../../shared/domain/domain-error.js';

export class PlannedMealNotFoundError extends DomainError {
  readonly code = 'PLANNED_MEAL_NOT_FOUND';

  constructor() {
    super('Repas planifié introuvable.');
  }
}
