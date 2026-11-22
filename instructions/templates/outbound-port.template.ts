// Squelette — à copier/renommer dans domain/ports/outbound/<name>.repository.port.ts puis adapter.
// Un Repository par Aggregate Root, vocabulaire métier (pas de requêtes/pagination technique dans le contrat).
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/06-persistence-and-repositories.instructions.md

// import { Example, ExampleId } from '../../entities/example.entity';

/**
 * Outbound Port : besoin exprimé par le centre (Domain/Application). L'implémentation technique
 * (Prisma, etc.) vit dans l'Infrastructure et implémente cette interface — jamais l'inverse.
 */
export interface IExampleRepository {
  findById(id: unknown /* ExampleId */): Promise<unknown /* Example */ | null>;
  save(example: unknown /* Example */): Promise<void>;
  /** Méthode en langage métier, pas un `findAll` générique. */
  findOverdueExamples(thresholdDays: number): Promise<unknown[] /* Example[] */>;
}

export const EXAMPLE_REPOSITORY = Symbol('EXAMPLE_REPOSITORY');
