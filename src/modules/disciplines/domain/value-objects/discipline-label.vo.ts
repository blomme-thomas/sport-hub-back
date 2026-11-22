import { InvalidDisciplineLabelError } from '../errors/invalid-discipline-label.error.js';
import type { DisciplineTypeKey } from './discipline-type-key.vo.js';

const LABEL_MAX_LENGTH = 60;

export class DisciplineLabel {
  private constructor(private readonly value: string) {}

  /**
   * Crée un libellé saisi par l'utilisateur, après retrait des espaces en bordure.
   *
   * @throws InvalidDisciplineLabelError si le libellé est vide ou dépasse 60 caractères.
   */
  static create(raw: string): DisciplineLabel {
    const value = raw.trim();
    if (value.length === 0) {
      throw new InvalidDisciplineLabelError('le libellé ne peut pas être vide');
    }
    if (value.length > LABEL_MAX_LENGTH) {
      throw new InvalidDisciplineLabelError(
        `le libellé dépasse ${LABEL_MAX_LENGTH} caractères`,
      );
    }
    return new DisciplineLabel(value);
  }

  /** Libellé provisoire d'une discipline jamais renommée : la clé de type, sans limite de longueur. */
  static fromTypeKey(typeKey: DisciplineTypeKey): DisciplineLabel {
    return new DisciplineLabel(typeKey.toString());
  }

  /** Reconstitue un libellé déjà persisté tel quel ; la borne de longueur ne s'applique qu'à la saisie. */
  static reconstitute(value: string): DisciplineLabel {
    return new DisciplineLabel(value);
  }

  equals(other: DisciplineLabel): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
