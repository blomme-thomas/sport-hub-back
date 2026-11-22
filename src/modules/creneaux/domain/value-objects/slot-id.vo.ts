import { randomUUID } from 'node:crypto';
import { InvalidSlotError } from '../errors/invalid-slot.error.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SlotId {
  private constructor(private readonly value: string) {}

  static generate(): SlotId {
    return new SlotId(randomUUID());
  }

  /** @throws InvalidSlotError si la valeur n'est pas un UUID. */
  static create(value: string): SlotId {
    if (!UUID_PATTERN.test(value)) {
      throw new InvalidSlotError("l'identifiant du créneau n'est pas un UUID");
    }
    return new SlotId(value);
  }

  equals(other: SlotId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
