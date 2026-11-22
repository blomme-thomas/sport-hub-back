// Squelette — à copier/renommer dans domain/entities/<name>.entity.ts puis adapter.
// Une Aggregate Root reste une Entity : même dossier `domain/entities/`, pas de dossier `aggregates/` séparé.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/02-domain-model.instructions.md, instructions/03-aggregates-and-consistency.instructions.md

// import { AggregateRoot } from '@shared/domain/aggregate-root'; // adapter l'alias/chemin au projet
// import { ExampleLine } from './example-line.entity'; // Entity membre, pas Root
// import { ExampleValidatedEvent } from '../events/example-validated.event';
// import { ExampleAlreadyShippedError } from '../errors/example-already-shipped.error';

export class ExampleId {
  private constructor(private readonly value: string) {}
  static create(value: string): ExampleId {
    if (!value) throw new Error('ExampleId must not be empty');
    return new ExampleId(value);
  }
  equals(other: ExampleId): boolean {
    return this.value === other.value;
  }
  toString(): string {
    return this.value;
  }
}

type ExampleStatus = 'draft' | 'validated' | 'shipped';

interface ExampleProps {
  status: ExampleStatus;
  lines: unknown[]; // ExampleLine[]
}

/**
 * Aggregate Root : frontière de cohérence. Toute modification passe par une méthode de cette classe ;
 * l'extérieur ne détient jamais de référence vers les objets internes (lignes, etc.).
 * Collecte les Domain Events ; leur publication est faite par l'Application APRÈS persistance réussie (05/07).
 */
export class Example /* extends AggregateRoot */ {
  private readonly domainEvents: unknown[] = []; // fourni par AggregateRoot dans un vrai projet

  private constructor(
    private readonly id: ExampleId,
    private props: ExampleProps,
  ) {}

  /** Factory de création : garantit un état initial valide. Si la construction grossit, l'extraire dans domain/factories/. */
  static create(id: ExampleId): Example {
    return new Example(id, { status: 'draft', lines: [] });
  }

  /** Factory de reconstitution depuis le stockage : ne doit pas contourner les invariants. */
  static reconstitute(id: ExampleId, props: ExampleProps): Example {
    return new Example(id, props);
  }

  getId(): ExampleId {
    return this.id;
  }

  /** Comportement métier nommé exprimant une intention — pas de setter générique sur `status`. */
  validate(): void {
    if (this.props.status === 'shipped') {
      throw new Error('ExampleAlreadyShippedError'); // remplacer par: throw new ExampleAlreadyShippedError(this.id)
    }
    this.props.status = 'validated';
    this.domainEvents.push({ type: 'ExampleValidated', id: this.id.toString() }); // remplacer par new ExampleValidatedEvent(this.id)
  }

  /** Vue en lecture seule — jamais la collection interne mutable directement. */
  getLines(): ReadonlyArray<unknown> {
    return [...this.props.lines];
  }

  get status(): ExampleStatus {
    return this.props.status;
  }

  pullDomainEvents(): unknown[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }
}
