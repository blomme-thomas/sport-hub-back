import type { Food } from '../../domain/entities/food.entity.js';

export interface CreateFoodCommand {
  name: string;
  unit: string;
  categories: readonly string[];
  calories?: number | null;
  proteins?: number | null;
  carbohydrates?: number | null;
  fats?: number | null;
  sugars?: number | null;
}

export interface UpdateFoodCommand {
  id: string;
  name?: string;
  unit?: string;
  categories?: readonly string[];
  calories?: number | null;
  proteins?: number | null;
  carbohydrates?: number | null;
  fats?: number | null;
  sugars?: number | null;
}

export interface GetFoodQuery {
  id: string;
}

export interface ListFoodsQuery {
  category?: string;
  search?: string;
}

export class FoodDto {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly unit: string,
    readonly categories: string[],
    readonly calories: number | null,
    readonly proteins: number | null,
    readonly carbohydrates: number | null,
    readonly fats: number | null,
    readonly sugars: number | null,
  ) {}

  static fromDomain(food: Food): FoodDto {
    return new FoodDto(
      food.id.toString(),
      food.name.toString(),
      food.unit.toString(),
      food.categories,
      food.nutrition.calories,
      food.nutrition.proteins,
      food.nutrition.carbohydrates,
      food.nutrition.fats,
      food.nutrition.sugars,
    );
  }
}
