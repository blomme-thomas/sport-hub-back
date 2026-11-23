import { randomUUID } from 'node:crypto';
import { InvalidFoodError } from '../errors/invalid-food.error.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class FoodId {
  private constructor(private readonly value: string) {}

  static generate(): FoodId {
    return new FoodId(randomUUID());
  }

  static from(value: string): FoodId {
    if (!UUID_PATTERN.test(value)) {
      throw new InvalidFoodError(
        "l'identifiant de l'aliment n'est pas un UUID",
      );
    }
    return new FoodId(value);
  }

  equals(other: FoodId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
