import type { PlannedMeal as PlannedMealRecord } from '../../../../../core/prisma/generated/client.js';
import { PlannedMeal } from '../../../domain/entities/planned-meal.entity.js';
import { MealDate } from '../../../domain/value-objects/meal-date.vo.js';
import { isMealTag } from '../../../domain/value-objects/meal-tag.vo.js';
import { PlannedMealId } from '../../../domain/value-objects/planned-meal-id.vo.js';
import { RecipeId } from '../../../domain/value-objects/recipe-id.vo.js';
import { InvalidPlannedMealError } from '../../../domain/errors/invalid-planned-meal.error.js';

export class PlannedMealMapper {
  static toDomain(record: PlannedMealRecord): PlannedMeal {
    if (!isMealTag(record.mealTag)) {
      throw new InvalidPlannedMealError('le repas persisté est inconnu');
    }
    return PlannedMeal.reconstitute({
      id: PlannedMealId.from(record.id),
      recipeId: RecipeId.from(record.recipeId),
      date: MealDate.fromUtcDate(record.date),
      mealTag: record.mealTag,
    });
  }

  static toPersistence(plannedMeal: PlannedMeal): {
    id: string;
    recipeId: string;
    date: Date;
    mealTag: string;
  } {
    return {
      id: plannedMeal.id.toString(),
      recipeId: plannedMeal.recipeId.toString(),
      date: new Date(`${plannedMeal.date.toString()}T00:00:00Z`),
      mealTag: plannedMeal.mealTag,
    };
  }
}
