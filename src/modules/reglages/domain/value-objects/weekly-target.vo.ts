import { InvalidWeeklyTargetError } from '../errors/invalid-weekly-target.error.js';

/** Colonne INTEGER 32 bits, comme pour les temps cibles des objectifs. */
export const MAX_WEEKLY_TARGET_SECONDS = 2147483647;

/** Temps cible hebdomadaire, en secondes entières. `null` signifie « pas de cible ». */
export class WeeklyTarget {
  private constructor(private readonly totalSeconds: number | null) {}

  /** @throws InvalidWeeklyTargetError si la valeur n'est pas un entier entre 1 et MAX_WEEKLY_TARGET_SECONDS. */
  static create(seconds: number | null): WeeklyTarget {
    if (seconds === null) {
      return new WeeklyTarget(null);
    }
    if (
      !Number.isInteger(seconds) ||
      seconds <= 0 ||
      seconds > MAX_WEEKLY_TARGET_SECONDS
    ) {
      throw new InvalidWeeklyTargetError();
    }
    return new WeeklyTarget(seconds);
  }

  seconds(): number | null {
    return this.totalSeconds;
  }
}
