import { Inject, Injectable } from '@nestjs/common';
import { RecipeNotFoundError } from '../../domain/errors/recipe-not-found.error.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import {
  type IRecipeRepository,
  RECIPE_REPOSITORY,
} from '../../domain/ports/outbound/recipe.repository.port.js';
import { RecipeId } from '../../domain/value-objects/recipe-id.vo.js';
import {
  type NutritionLine,
  summarizeRecipeNutrition,
} from '../../domain/services/summarize-recipe-nutrition.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { type RecipeDetailDto, RecipeDto } from '../dtos/recipe.dto.js';

const NO_NUTRITION = NutritionValues.create({
  calories: null,
  proteins: null,
  carbohydrates: null,
  fats: null,
  sugars: null,
});

@Injectable()
export class GetRecipeUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipes: IRecipeRepository,
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * Renvoie une recette avec sa composition et sa synthèse nutritionnelle, recalculée à chaque lecture.
   *
   * @throws RecipeNotFoundError si la recette n'existe pas.
   */
  async execute(query: { id: string }): Promise<RecipeDetailDto> {
    const recipe = await this.recipes.findById(RecipeId.from(query.id));
    if (recipe === null) {
      throw new RecipeNotFoundError();
    }
    const lines: NutritionLine[] = [];
    for (const item of recipe.items) {
      const food = await this.foods.findById(item.foodId);
      lines.push({
        foodId: item.foodId.toString(),
        component: item.component,
        quantity: item.quantity,
        per100g: food?.nutrition ?? NO_NUTRITION,
      });
    }
    return {
      recipe: RecipeDto.fromDomain(recipe),
      nutrition: summarizeRecipeNutrition(lines),
    };
  }
}
