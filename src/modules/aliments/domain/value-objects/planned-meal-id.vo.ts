import { randomUUID } from 'node:crypto';
import { InvalidPlannedMealError } from '../errors/invalid-planned-meal.error.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PlannedMealId {
  private constructor(private readonly value: string) {}

  static generate(): PlannedMealId {
    return new PlannedMealId(randomUUID());
  }

  static from(value: string): PlannedMealId {
    if (!UUID_PATTERN.test(value)) {
      throw new InvalidPlannedMealError(
        "l'identifiant du repas n'est pas un UUID",
      );
    }
    return new PlannedMealId(value);
  }

  equals(other: PlannedMealId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
