import { InvalidTargetTimeError } from '../errors/invalid-target-time.error.js';

export const MAX_TARGET_TIME_SECONDS = 2147483647;

export class TargetTime {
  private constructor(private readonly totalSeconds: number) {}

  /** Garantit un temps cible entier en secondes, compris entre 1 et MAX_TARGET_TIME_SECONDS (colonne INTEGER 32 bits). @throws InvalidTargetTimeError sinon. */
  static create(seconds: number): TargetTime {
    if (
      !Number.isInteger(seconds) ||
      seconds <= 0 ||
      seconds > MAX_TARGET_TIME_SECONDS
    ) {
      throw new InvalidTargetTimeError();
    }
    return new TargetTime(seconds);
  }

  seconds(): number {
    return this.totalSeconds;
  }
}
