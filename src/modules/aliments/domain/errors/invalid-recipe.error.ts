import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidRecipeError extends DomainError {
  readonly code = 'INVALID_RECIPE';

  constructor(reason: string) {
    super(`Recette invalide : ${reason}.`);
  }
}
