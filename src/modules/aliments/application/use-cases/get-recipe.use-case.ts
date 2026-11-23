import { Inject, Injectable } from '@nestjs/common';
import { RecipeNotFoundError } from '../../domain/errors/recipe-not-found.error.js';
import {
  type IRecipeRepository,
  RECIPE_REPOSITORY,
} from '../../domain/ports/outbound/recipe.repository.port.js';
import { RecipeId } from '../../domain/value-objects/recipe-id.vo.js';
import { RecipeDto } from '../dtos/recipe.dto.js';

@Injectable()
export class GetRecipeUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipes: IRecipeRepository,
  ) {}

  /**
   * Renvoie une recette avec sa composition.
   *
   * @throws RecipeNotFoundError si la recette n'existe pas.
   */
  async execute(query: { id: string }): Promise<RecipeDto> {
    const recipe = await this.recipes.findById(RecipeId.from(query.id));
    if (recipe === null) {
      throw new RecipeNotFoundError();
    }
    return RecipeDto.fromDomain(recipe);
  }
}
