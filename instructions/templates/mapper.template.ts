// Squelette — à copier/renommer dans infrastructure/persistence/prisma/<name>.mapper.ts puis adapter.
// Convertit Domain Model <-> modèle Prisma. Ne contient AUCUNE règle métier.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/06-persistence-and-repositories.instructions.md

// import { Example, ExampleId } from '../../../domain/entities/example.entity';
// import { Prisma, Example as PrismaExample } from '@prisma/client';

/** Mapper : connaît les deux modèles (Domain et Prisma) ; vit du côté Infrastructure. */
export class ExampleMapper {
  static toDomain(record: { id: string; status: string }): unknown /* Example */ {
    // return Example.reconstitute(ExampleId.create(record.id), { status: record.status as any, lines: [] });
    return record;
  }

  static toPersistence(example: unknown /* Example */): { id: string; status: string } /* Prisma.ExampleCreateInput */ {
    const e = example as { getId(): { toString(): string }; status: string };
    return { id: e.getId().toString(), status: e.status };
  }
}
