import { InvalidFoodError } from '../errors/invalid-food.error.js';

const MAX_LENGTH = 20;

export class FoodUnit {
  private constructor(private readonly value: string) {}

  static create(value: string): FoodUnit {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new InvalidFoodError("l'unité est obligatoire");
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidFoodError(
        `l'unité ne doit pas dépasser ${MAX_LENGTH} caractères`,
      );
    }
    return new FoodUnit(trimmed);
  }

  toString(): string {
    return this.value;
  }
}
