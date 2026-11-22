// Squelette — à copier/renommer dans domain/events/<name>.event.ts puis adapter.
// Nommage : participe passé, langage métier (ex. OrderValidatedEvent), jamais un nom d'action technique.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/00-glossary-and-artifacts.instructions.md, instructions/07-events-and-messaging.instructions.md

// import { ExampleId } from '../entities/example.entity';

/**
 * Domain Event : fait métier passé, significatif. Enregistré par l'Aggregate, publié par l'Application
 * APRÈS persistance réussie. Reste interne au Bounded Context (≠ Integration Event, voir 07).
 */
export class ExampleValidatedEvent {
  readonly occurredAt: Date;

  constructor(
    readonly exampleId: string /* ExampleId */,
  ) {
    this.occurredAt = new Date();
  }
}
