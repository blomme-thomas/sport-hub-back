// Squelette — à copier/renommer dans domain/errors/<name>.error.ts puis adapter.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/00-glossary-and-artifacts.instructions.md §5, instructions/02-domain-model.instructions.md

// import { DomainError } from '@shared/domain/domain-error'; // adapter l'alias/chemin au projet

/**
 * Business Error : violation d'une règle du Domain, exprimée en langage métier.
 * Distincte d'une Technical Error (infrastructure) — ne jamais mélanger les deux.
 * Levée par le Domain ; traduite en code HTTP/réponse aux frontières (voir 08), pas ici.
 */
export class ExampleAlreadyShippedError extends Error /* extends DomainError */ {
  constructor(exampleId: string) {
    super(`Example ${exampleId} has already been shipped and can no longer be modified`);
    this.name = 'ExampleAlreadyShippedError';
  }
}
