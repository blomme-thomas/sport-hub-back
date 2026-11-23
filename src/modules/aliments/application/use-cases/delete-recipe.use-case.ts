import { Inject, Injectable } from '@nestjs/common';
import { RecipeInUseError } from '../../domain/errors/recipe-in-use.error.js';
import { RecipeNotFoundError } from '../../domain/errors/recipe-not-found.error.js';
import {
  type IPlannedMealRepository,
  PLANNED_MEAL_REPOSITORY,
} from '../../domain/ports/outbound/planned-meal.repository.port.js';
import {
  type IRecipeRepository,
  RECIPE_REPOSITORY,
} from '../../domain/ports/outbound/recipe.repository.port.js';
import { RecipeId } from '../../domain/value-objects/recipe-id.vo.js';

@Injectable()
export class DeleteRecipeUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipes: IRecipeRepository,
    @Inject(PLANNED_MEAL_REPOSITORY)
    private readonly plannedMeals: IPlannedMealRepository,
  ) {}

  /**
   * Supprime une recette et ses items. Si elle est placée au planning, refuse sans confirmation et retire ces repas avec confirmation.
   *
   * @throws RecipeNotFoundError si la recette n'existe pas.
   * @throws RecipeInUseError si la recette est planifiée et que la suppression n'est pas confirmée.
   */
  async execute(command: { id: string; confirm?: boolean }): Promise<void> {
    const id = RecipeId.from(command.id);
    if ((await this.recipes.findById(id)) === null) {
      throw new RecipeNotFoundError();
    }
    const used = await this.plannedMeals.countByRecipe(id);
    if (used > 0 && command.confirm !== true) {
      throw new RecipeInUseError(used);
    }
    if (used > 0) {
      await this.plannedMeals.deleteByRecipe(id);
    }
    await this.recipes.delete(id);
  }
}
