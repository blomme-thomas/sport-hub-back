import { InvalidActivityError } from '../errors/invalid-activity.error.js';

export class GarminActivityId {
  private constructor(private readonly value: string) {}

  /**
   * Construit l'identifiant Garmin d'une activité en retirant les espaces autour de la valeur.
   *
   * @throws InvalidActivityError si la valeur est vide.
   */
  static create(value: string): GarminActivityId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new InvalidActivityError("l'identifiant Garmin est vide");
    }
    return new GarminActivityId(trimmed);
  }

  equals(other: GarminActivityId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
