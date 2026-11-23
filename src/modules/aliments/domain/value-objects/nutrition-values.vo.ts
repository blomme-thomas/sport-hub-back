import { InvalidFoodError } from '../errors/invalid-food.error.js';

export interface NutritionInput {
  calories: number | null;
  proteins: number | null;
  carbohydrates: number | null;
  fats: number | null;
  sugars: number | null;
}

export class NutritionValues {
  private constructor(
    readonly calories: number | null,
    readonly proteins: number | null,
    readonly carbohydrates: number | null,
    readonly fats: number | null,
    readonly sugars: number | null,
  ) {}

  static create(input: NutritionInput): NutritionValues {
    return new NutritionValues(
      checkedValue(input.calories),
      checkedValue(input.proteins),
      checkedValue(input.carbohydrates),
      checkedValue(input.fats),
      checkedValue(input.sugars),
    );
  }
}

function checkedValue(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidFoodError(
      'une valeur nutritionnelle doit être vide ou un nombre positif',
    );
  }
  return value;
}
