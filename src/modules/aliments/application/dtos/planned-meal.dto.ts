import type { PlannedMeal } from '../../domain/entities/planned-meal.entity.js';

export interface AddPlannedMealCommand {
  recipeId: string;
  date: string;
  mealTag: string;
}

export interface MovePlannedMealCommand {
  id: string;
  date?: string;
  mealTag?: string;
}

export class PlannedMealDto {
  private constructor(
    readonly id: string,
    readonly recipeId: string,
    readonly date: string,
    readonly mealTag: string,
  ) {}

  static fromDomain(plannedMeal: PlannedMeal): PlannedMealDto {
    return new PlannedMealDto(
      plannedMeal.id.toString(),
      plannedMeal.recipeId.toString(),
      plannedMeal.date.toString(),
      plannedMeal.mealTag,
    );
  }
}
