import { DomainError } from '../../../../shared/domain/domain-error.js';
import type { PlanImportIssue } from '../../../../shared/import/plan-import.js';

/** Fichier `plan-recettes` invalide : aucune recette n'est enregistrée. */
export class RecipeImportInvalidError extends DomainError {
  readonly code = 'RECIPE_IMPORT_INVALID';

  constructor(readonly errors: PlanImportIssue[]) {
    super(
      `Fichier d'import invalide : ${errors.length} erreur(s), aucune recette importée.`,
    );
  }
}

/** Au moins une recette du fichier porte déjà le nom d'une recette existante : rien n'est enregistré. */
export class RecipeImportDuplicateError extends DomainError {
  readonly code = 'RECIPE_IMPORT_DUPLICATE';

  constructor(readonly errors: PlanImportIssue[]) {
    super(
      `Import refusé : ${errors.length} recette(s) portent déjà un nom existant.`,
    );
  }
}
