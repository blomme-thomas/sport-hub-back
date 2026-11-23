import { Inject, Injectable } from '@nestjs/common';
import { RecipeNotFoundError } from '../../domain/errors/recipe-not-found.error.js';
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
  ) {}

  /**
   * Supprime une recette et ses items.
   *
   * @throws RecipeNotFoundError si la recette n'existe pas.
   */
  async execute(command: { id: string }): Promise<void> {
    const id = RecipeId.from(command.id);
    if ((await this.recipes.findById(id)) === null) {
      throw new RecipeNotFoundError();
    }
    await this.recipes.delete(id);
  }
}
