import { InvalidSlotError } from '../errors/invalid-slot.error.js';

export class SlotTimeZone {
  private constructor(private readonly value: string) {}

  /**
   * Construit un fuseau IANA reconnu par `Intl`. Le fuseau est une métadonnée : il ne sert jamais à convertir une heure.
   *
   * @throws InvalidSlotError si le fuseau est vide ou inconnu.
   */
  static create(value: string): SlotTimeZone {
    if (value.trim().length === 0 || !isKnownIanaTimeZone(value)) {
      throw new InvalidSlotError('le fuseau horaire est inconnu');
    }
    return new SlotTimeZone(value);
  }

  equals(other: SlotTimeZone): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

function isKnownIanaTimeZone(value: string): boolean {
  if (/^[+-]/.test(value)) {
    return false;
  }
  try {
    return (
      new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions()
        .timeZone.length > 0
    );
  } catch {
    return false;
  }
}
