// Squelette — à copier/renommer dans domain/services/<name>.service.ts puis adapter.
// Dernier recours : utiliser seulement si la règle n'a pas de propriétaire naturel parmi les Entities/VOs (voir 02, 11).
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/02-domain-model.instructions.md

// import { Example } from '../entities/example.entity';

/**
 * Domain Service : opération métier sans état, sans I/O, sans framework.
 * Ne pas confondre avec un Application Service (qui orchestre : transaction, Ports, appels externes).
 */
export class ExampleDiscountCalculator {
  /** Règle transverse impliquant plusieurs Aggregates lus en entrée (jamais détenus en référence). */
  calculateDiscount(examples: ReadonlyArray<{ amount: number }>): number {
    const total = examples.reduce((sum, e) => sum + e.amount, 0);
    if (total > 1000) return 0.1;
    if (total > 500) return 0.05;
    return 0;
  }
}
