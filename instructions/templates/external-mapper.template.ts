// Squelette — à copier/renommer dans infrastructure/mappers/<name>.external-mapper.ts puis adapter.
// Traduit le modèle externe (payload du fournisseur) vers le modèle du domaine, et inversement.
// Ne contient AUCUN appel réseau. Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/08-api-and-boundaries.instructions.md

// import { Activity } from '../../domain/entities/activity.entity';

/** Mapper externe : connaît le format du fournisseur ; l'Adapter l'appelle, le Domain ne le voit jamais. */
export class ExampleExternalMapper {
  static toDomain(payload: { externalId: number; label: string }): { id: string; label: string } /* Activity */ {
    return { id: String(payload.externalId), label: payload.label };
  }
}
