import { DomainError } from '../../../../shared/domain/domain-error.js';

export class RecipeInUseError extends DomainError {
  readonly code = 'RECIPE_IN_USE';

  constructor(count: number) {
    super(
      `Recette planifiée sur ${count} repas : confirmer la suppression pour retirer ces repas.`,
    );
  }
}
