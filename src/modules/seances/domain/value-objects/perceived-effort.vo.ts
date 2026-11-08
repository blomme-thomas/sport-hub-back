import { InvalidSessionModuleError } from '../errors/invalid-session-module.error.js';

const MIN = 1;
const MAX = 10;

export class PerceivedEffort {
  private constructor(private readonly level: number) {}

  /** @throws InvalidSessionModuleError si la valeur n'est pas un entier de 1 à 10. */
  static create(level: number): PerceivedEffort {
    if (!Number.isInteger(level) || level < MIN || level > MAX) {
      throw new InvalidSessionModuleError(
        `l'effort perçu doit être un entier de ${MIN} à ${MAX}`,
      );
    }
    return new PerceivedEffort(level);
  }

  value(): number {
    return this.level;
  }
}
