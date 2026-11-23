import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidShoppingListPeriodError extends DomainError {
  readonly code = 'SHOPPING_LIST_PERIOD_INVALID';

  constructor(reason: string) {
    super(`Période de liste de courses invalide : ${reason}.`);
  }
}
