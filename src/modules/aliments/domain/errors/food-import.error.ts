import { DomainError } from '../../../../shared/domain/domain-error.js';
import type { PlanImportIssue } from '../../../../shared/import/plan-import.js';

/** Fichier `plan-aliments` invalide : aucun aliment n'est enregistré. */
export class FoodImportInvalidError extends DomainError {
  readonly code = 'FOOD_IMPORT_INVALID';

  constructor(readonly errors: PlanImportIssue[]) {
    super(
      `Fichier d'import invalide : ${errors.length} erreur(s), aucun aliment importé.`,
    );
  }
}

/** Au moins un aliment du fichier porte déjà le nom d'un aliment existant : rien n'est enregistré. */
export class FoodImportDuplicateError extends DomainError {
  readonly code = 'FOOD_IMPORT_DUPLICATE';

  constructor(readonly errors: PlanImportIssue[]) {
    super(
      `Import refusé : ${errors.length} aliment(s) portent déjà un nom existant.`,
    );
  }
}
