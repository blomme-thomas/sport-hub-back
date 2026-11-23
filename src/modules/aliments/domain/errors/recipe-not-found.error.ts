import { DomainError } from '../../../../shared/domain/domain-error.js';

export class RecipeNotFoundError extends DomainError {
  readonly code = 'RECIPE_NOT_FOUND';

  constructor() {
    super('Recette introuvable.');
  }
}
