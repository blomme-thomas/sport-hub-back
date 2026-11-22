// Squelette — à copier/renommer dans application/dtos/<name>.dto.ts puis adapter.
// Application DTO : contrat interne de la couche Application, distinct du Transport DTO (voir 08).
// Pas de class-validator/class-transformer ici — ce n'est pas un contrat externe.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/05-application-layer.instructions.md

// import { Example } from '../../domain/entities/example.entity';

/** Jamais une Entity/Aggregate exposée hors Application : ce DTO est la seule chose qui en sort. */
export class ExampleDto {
  private constructor(
    readonly id: string,
    readonly status: string,
  ) {}

  static fromDomain(example: unknown /* Example */): ExampleDto {
    const e = example as { getId(): { toString(): string }; status: string };
    return new ExampleDto(e.getId().toString(), e.status);
  }
}
