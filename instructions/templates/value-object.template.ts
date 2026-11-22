// Squelette — à copier/renommer dans domain/value-objects/<name>.vo.ts puis adapter.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/02-domain-model.instructions.md

// import { ValueObject } from '@shared/domain/value-object'; // adapter l'alias/chemin au projet

interface ExampleValueObjectProps {
  amount: number;
  currency: string;
}

/**
 * Value Object : immuable, défini par ses attributs, comparé par valeur.
 * Toute instance existante est valide — la validation se fait à la création, jamais après.
 */
export class ExampleValueObject /* extends ValueObject<ExampleValueObjectProps> */ {
  private constructor(private readonly props: ExampleValueObjectProps) {
    // extends ValueObject<...>(props) si la classe de base le prévoit
  }

  /** Point d'entrée unique : valide puis construit. Ne jamais contourner avec `new` en dehors de cette classe. */
  static create(amount: number, currency: string): ExampleValueObject {
    if (amount < 0) {
      throw new Error('Amount must not be negative'); // remplacer par une Business Error si le contexte l'exige
    }
    if (!currency || currency.length !== 3) {
      throw new Error('Currency must be a 3-letter ISO code');
    }
    return new ExampleValueObject({ amount, currency });
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  /** Une "modification" renvoie toujours une nouvelle instance — jamais de mutation interne. */
  add(other: ExampleValueObject): ExampleValueObject {
    if (other.currency !== this.props.currency) {
      throw new Error('Cannot add values with different currencies');
    }
    return ExampleValueObject.create(this.props.amount + other.amount, this.props.currency);
  }

  /** Comparaison par valeur, pas par référence. */
  equals(other: ExampleValueObject | undefined | null): boolean {
    if (!other) return false;
    return this.props.amount === other.props.amount && this.props.currency === other.props.currency;
  }

  /** Forme primitive pour mapping (persistance, transport) — jamais exposé comme state mutable. */
  toPrimitives(): ExampleValueObjectProps {
    return { ...this.props };
  }
}
