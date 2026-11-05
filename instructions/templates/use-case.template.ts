// Squelette — à copier/renommer dans application/use-cases/<verb-noun>.use-case.ts puis adapter.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/05-application-layer.instructions.md

import { Inject, Injectable } from '@nestjs/common';
// import { EXAMPLE_REPOSITORY, IExampleRepository } from '../../domain/ports/outbound/example.repository.port';
// import { ExampleId } from '../../domain/entities/example.entity';
// import { ExampleDto } from '../dtos/example.dto';

/**
 * Use Case : orchestre (charge, appelle le Domain, persiste, publie les events) — AUCUNE règle métier ici.
 * Un Use Case = une intention métier (verbe à l'impératif), un Handler par Use Case.
 */
@Injectable()
export class ValidateExampleUseCase {
  constructor(
    @Inject('EXAMPLE_REPOSITORY' /* EXAMPLE_REPOSITORY */)
    private readonly examples: unknown /* IExampleRepository */,
  ) {}

  async execute(exampleId: string /* ExampleId */): Promise<void /* ExampleDto */> {
    // const example = await this.examples.findById(exampleId);
    // if (!example) throw new NotFoundException(...);
    // example.validate();                 // la règle métier vit dans l'Aggregate, pas ici
    // await this.examples.save(example);
    // publier les Domain Events APRÈS la persistance réussie (voir 07)
    // return ExampleDto.fromDomain(example);
    throw new Error('Not implemented — squelette à compléter');
  }
}
