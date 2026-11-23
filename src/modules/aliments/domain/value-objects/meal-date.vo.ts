import { InvalidPlannedMealError } from '../errors/invalid-planned-meal.error.js';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class MealDate {
  private constructor(private readonly value: string) {}

  /**
   * Accepte une date `AAAA-MM-JJ` réelle (rejette 2026-02-30).
   *
   * @throws InvalidPlannedMealError si le format ou la date est invalide.
   */
  static create(raw: string): MealDate {
    const match = DATE_PATTERN.exec(raw);
    if (match === null) {
      throw new InvalidPlannedMealError(
        'la date doit être au format AAAA-MM-JJ',
      );
    }
    const [year, month, day] = [
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    ];
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new InvalidPlannedMealError("la date n'existe pas");
    }
    return new MealDate(raw);
  }

  static fromUtcDate(date: Date): MealDate {
    return new MealDate(date.toISOString().slice(0, 10));
  }

  addDays(days: number): MealDate {
    const date = new Date(`${this.value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return MealDate.fromUtcDate(date);
  }

  isBefore(other: MealDate): boolean {
    return this.value < other.value;
  }

  equals(other: MealDate): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
