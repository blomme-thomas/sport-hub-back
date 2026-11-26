import { Inject, Injectable } from '@nestjs/common';
import {
  type NutritionLine,
  type RecipeNutritionSummary,
  summarizeRecipeNutrition,
} from '../../domain/services/summarize-recipe-nutrition.js';
import { type RecipeComponent } from '../../domain/value-objects/recipe-component.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { FoodId } from '../../domain/value-objects/food-id.vo.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import type { RecipeItemCommand } from '../dtos/recipe.dto.js';
import { checkRecipeComposition } from './check-recipe-composition.js';

const NO_NUTRITION = NutritionValues.create({
  calories: null,
  proteins: null,
  carbohydrates: null,
  fats: null,
  sugars: null,
});

/**
 * Calcule la synthèse nutritionnelle d'une composition sans rien enregistrer, pour l'aperçu en direct
 * pendant la saisie d'une recette. Même calcul que la lecture d'une recette enregistrée.
 *
 * @throws InvalidRecipeError si un aliment est introuvable ou hors de la famille de son composant.
 */
@Injectable()
export class PreviewRecipeNutritionUseCase {
  constructor(
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  async execute(command: {
    items: readonly RecipeItemCommand[];
  }): Promise<RecipeNutritionSummary> {
    await checkRecipeComposition(this.foods, command.items);
    const lines: NutritionLine[] = [];
    for (const item of command.items) {
      const food = await this.foods.findById(FoodId.from(item.foodId));
      lines.push({
        foodId: item.foodId,
        component: item.component as RecipeComponent | null,
        quantity: item.quantity,
        per100g: food?.nutrition ?? NO_NUTRITION,
      });
    }
    return summarizeRecipeNutrition(lines);
  }
}
