// Squelette — à copier/renommer dans domain/errors/<name>.error.ts puis adapter.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/00-glossary-and-artifacts.instructions.md §5, instructions/02-domain-model.instructions.md,
// instructions/11-repository-conventions.instructions.md §Erreurs HTTP

// Chemin relatif depuis src/modules/<module>/domain/errors/ (le projet n'a pas d'alias de chemin) ; extension .js (ES modules).
// import { DomainError } from '../../../../shared/domain/domain-error.js';

/**
 * Business Error : violation d'une règle du Domain, exprimée en langage métier.
 * Distincte d'une Technical Error (infrastructure) — ne jamais mélanger les deux.
 * Levée par le Domain ; traduite en code HTTP/réponse aux frontières (voir 08), pas ici.
 *
 * Le `code` est un contrat public (lu par le front) : UPPER_SNAKE_CASE, préfixé par le concept métier, jamais renommé.
 * Après création : déclarer son statut HTTP dans DOMAIN_ERROR_STATUS (src/core/filters/error-status.table.ts)
 * et l'ajouter à @ApiProblemResponses(...) des routes concernées.
 * Le message est renvoyé tel quel au client dans `detail` : il doit être sûr, en langage métier, sans donnée interne,
 * token, corps de réponse d'un système externe ni détail technique. Les détails techniques vont dans `cause`
 * (`super(message, { cause })`), qui n'est jamais renvoyée.
 */
export class ExampleAlreadyShippedError extends Error /* extends DomainError */ {
  // readonly code = 'EXAMPLE_ALREADY_SHIPPED';
  constructor(exampleId: string) {
    super(`Example ${exampleId} has already been shipped and can no longer be modified`);
    this.name = 'ExampleAlreadyShippedError';
  }
}
