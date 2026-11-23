import type { PlannedMeal } from '../../entities/planned-meal.entity.js';
import type { MealDate } from '../../value-objects/meal-date.vo.js';
import type { PlannedMealId } from '../../value-objects/planned-meal-id.vo.js';
import type { RecipeId } from '../../value-objects/recipe-id.vo.js';

export interface IPlannedMealRepository {
  /** Renvoie les repas planifiés entre deux dates incluses, triés par date puis par repas. */
  findBetween(start: MealDate, end: MealDate): Promise<PlannedMeal[]>;

  /** Renvoie le repas planifié portant cet identifiant, ou null. */
  findById(id: PlannedMealId): Promise<PlannedMeal | null>;

  /** Compte les repas planifiés utilisant cette recette. */
  countByRecipe(recipeId: RecipeId): Promise<number>;

  /** Enregistre le repas planifié : crée s'il est nouveau, met à jour sinon. */
  save(plannedMeal: PlannedMeal): Promise<void>;

  /** Supprime un repas planifié. */
  delete(id: PlannedMealId): Promise<void>;

  /** Supprime tous les repas planifiés utilisant cette recette. */
  deleteByRecipe(recipeId: RecipeId): Promise<void>;
}

export const PLANNED_MEAL_REPOSITORY = Symbol('PLANNED_MEAL_REPOSITORY');
