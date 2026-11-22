import { InvalidDisciplineError } from '../errors/invalid-discipline.error.js';

export class DisciplineTypeKey {
  static readonly MAX_LENGTH = 100;

  private constructor(private readonly value: string) {}

  /**
   * Crée la clé de type d'une discipline après retrait des espaces en bordure.
   *
   * @throws InvalidDisciplineError si la clé est vide ou dépasse 100 caractères après retrait des espaces.
   */
  static create(raw: string): DisciplineTypeKey {
    const value = raw.trim();
    if (value.length === 0) {
      throw new InvalidDisciplineError('la clé de type est vide');
    }
    if (value.length > DisciplineTypeKey.MAX_LENGTH) {
      throw new InvalidDisciplineError('la clé de type dépasse 100 caractères');
    }
    return new DisciplineTypeKey(value);
  }

  equals(other: DisciplineTypeKey): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
