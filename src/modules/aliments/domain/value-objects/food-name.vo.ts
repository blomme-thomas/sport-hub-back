import { InvalidFoodError } from '../errors/invalid-food.error.js';

const MAX_LENGTH = 200;

export class FoodName {
  private constructor(private readonly value: string) {}

  static create(value: string): FoodName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new InvalidFoodError('le nom est obligatoire');
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidFoodError(
        `le nom ne doit pas dépasser ${MAX_LENGTH} caractères`,
      );
    }
    return new FoodName(trimmed);
  }

  toString(): string {
    return this.value;
  }
}
