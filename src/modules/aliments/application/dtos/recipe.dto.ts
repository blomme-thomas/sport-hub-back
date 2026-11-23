import type { Recipe } from '../../domain/entities/recipe.entity.js';
import type { RecipeNutritionSummary } from '../../domain/services/summarize-recipe-nutrition.js';

export interface RecipeDetailDto {
  recipe: RecipeDto;
  nutrition: RecipeNutritionSummary;
}

export interface RecipeItemCommand {
  foodId: string;
  component: string | null;
  quantity: number | null;
}

export interface CreateRecipeCommand {
  name: string;
  mealTags: readonly string[];
  items?: readonly RecipeItemCommand[];
}

export interface UpdateRecipeCommand {
  id: string;
  name?: string;
  mealTags?: readonly string[];
  items?: readonly RecipeItemCommand[];
}

export interface RecipeItemDto {
  foodId: string;
  component: string | null;
  quantity: number | null;
}

export class RecipeDto {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly mealTags: string[],
    readonly items: RecipeItemDto[],
  ) {}

  static fromDomain(recipe: Recipe): RecipeDto {
    return new RecipeDto(
      recipe.id.toString(),
      recipe.name.toString(),
      recipe.mealTags,
      recipe.items.map((item) => ({
        foodId: item.foodId.toString(),
        component: item.component,
        quantity: item.quantity,
      })),
    );
  }
}
