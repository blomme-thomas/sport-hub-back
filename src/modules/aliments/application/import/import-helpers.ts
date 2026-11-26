import { DomainError } from '../../../../shared/domain/domain-error.js';
import type { PlanImportIssues } from '../../../../shared/import/plan-import.js';

/** Compare deux noms comme la recherche par nom : sans espaces autour et sans tenir compte de la casse. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Traduit une erreur métier de construction d'une entité en erreur d'import à son chemin ; toute autre erreur remonte. */
export function domainIssue<T>(
  error: unknown,
  path: string,
  issues: PlanImportIssues,
): T | null {
  if (error instanceof DomainError) {
    issues.add(path, 'VALUE_INVALID', error.message);
    return null;
  }
  throw error;
}
