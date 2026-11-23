import { DomainError } from '../../../../shared/domain/domain-error.js';

export class FoodNotFoundError extends DomainError {
  readonly code = 'FOOD_NOT_FOUND';

  constructor() {
    super("L'aliment demandé est introuvable.");
  }
}
