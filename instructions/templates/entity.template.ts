// Squelette — à copier/renommer dans domain/entities/<name>.entity.ts puis adapter.
// Pour une Entity membre d'un Aggregate (PAS la Root) : pas de Domain Events ici.
// Pour la Root, voir aggregate-root.template.ts.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/02-domain-model.instructions.md

// import { Entity } from '@shared/domain/entity'; // adapter l'alias/chemin au projet
// import { ExampleValueObject } from '../value-objects/example.vo';

class ExampleEntityId {
  private constructor(private readonly value: string) {}
  static create(value: string): ExampleEntityId {
    if (!value) throw new Error('ExampleEntityId must not be empty');
    return new ExampleEntityId(value);
  }
  equals(other: ExampleEntityId): boolean {
    return this.value === other.value;
  }
  toString(): string {
    return this.value;
  }
}

interface ExampleEntityProps {
  quantity: number;
  // unitPrice: ExampleValueObject;
}

/**
 * Entity membre d'un Aggregate : identité stable, état qui évolue via des comportements nommés,
 * jamais de setters génériques. Reste invalide-proof après chaque méthode.
 */
export class ExampleEntity /* extends Entity<ExampleEntityId> */ {
  private constructor(
    private readonly id: ExampleEntityId,
    private props: ExampleEntityProps,
  ) {}

  static create(id: ExampleEntityId, quantity: number): ExampleEntity {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    return new ExampleEntity(id, { quantity });
  }

  getId(): ExampleEntityId {
    return this.id;
  }

  /** Comportement métier nommé — pas de `setQuantity()` générique. */
  changeQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    this.props.quantity = newQuantity;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  equals(other: ExampleEntity): boolean {
    return this.id.equals(other.id);
  }
}
