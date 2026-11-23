import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidFoodError extends DomainError {
  readonly code = 'INVALID_FOOD';

  constructor(reason: string) {
    super(`Aliment invalide : ${reason}.`);
  }
}
