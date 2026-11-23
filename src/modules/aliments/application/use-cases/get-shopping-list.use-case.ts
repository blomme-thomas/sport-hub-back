import { Inject, Injectable } from '@nestjs/common';
import type { Recipe } from '../../domain/entities/recipe.entity.js';
import { InvalidShoppingListPeriodError } from '../../domain/errors/invalid-shopping-list-period.error.js';
import type { Food } from '../../domain/entities/food.entity.js';
import {
  buildShoppingList,
  type ShoppingLine,
  type ShoppingListItem,
} from '../../domain/services/build-shopping-list.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import {
  type IPlannedMealRepository,
  PLANNED_MEAL_REPOSITORY,
} from '../../domain/ports/outbound/planned-meal.repository.port.js';
import {
  type IRecipeRepository,
  RECIPE_REPOSITORY,
} from '../../domain/ports/outbound/recipe.repository.port.js';
import { FoodId } from '../../domain/value-objects/food-id.vo.js';
import { MealDate } from '../../domain/value-objects/meal-date.vo.js';
import { RecipeId } from '../../domain/value-objects/recipe-id.vo.js';

@Injectable()
export class GetShoppingListUseCase {
  constructor(
    @Inject(PLANNED_MEAL_REPOSITORY)
    private readonly plannedMeals: IPlannedMealRepository,
    @Inject(RECIPE_REPOSITORY)
    private readonly recipes: IRecipeRepository,
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * Calcule la liste de courses d'une période : chaque repas planifié compte pour une fois sa recette. Non sauvegardée.
   *
   * @throws InvalidShoppingListPeriodError si la fin précède le début.
   * @throws InvalidPlannedMealError si une date est invalide.
   */
  async execute(query: {
    from: string;
    to: string;
  }): Promise<ShoppingListItem[]> {
    const from = MealDate.create(query.from);
    const to = MealDate.create(query.to);
    if (to.isBefore(from)) {
      throw new InvalidShoppingListPeriodError('la fin précède le début');
    }

    const recipes = new Map<string, Recipe | null>();
    const foods = new Map<string, Food | null>();
    const lines: ShoppingLine[] = [];

    for (const meal of await this.plannedMeals.findBetween(from, to)) {
      const recipeKey = meal.recipeId.toString();
      if (!recipes.has(recipeKey)) {
        recipes.set(
          recipeKey,
          await this.recipes.findById(RecipeId.from(recipeKey)),
        );
      }
      const recipe = recipes.get(recipeKey);
      if (recipe === undefined || recipe === null) {
        continue;
      }
      for (const item of recipe.items) {
        const foodKey = item.foodId.toString();
        if (!foods.has(foodKey)) {
          foods.set(foodKey, await this.foods.findById(FoodId.from(foodKey)));
        }
        const food = foods.get(foodKey);
        if (food === undefined || food === null) {
          continue;
        }
        lines.push({
          foodId: foodKey,
          name: food.name.toString(),
          unit: food.unit.toString(),
          categories: food.categories,
          quantity: item.quantity,
        });
      }
    }

    return buildShoppingList(lines);
  }
}
