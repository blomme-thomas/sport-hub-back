import { Inject, Injectable } from '@nestjs/common';
import {
  type IRecipeRepository,
  RECIPE_REPOSITORY,
} from '../../domain/ports/outbound/recipe.repository.port.js';
import { RecipeDto } from '../dtos/recipe.dto.js';

@Injectable()
export class ListRecipesUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipes: IRecipeRepository,
  ) {}

  /** Renvoie toutes les recettes, triées par nom. */
  async execute(): Promise<RecipeDto[]> {
    const recipes = await this.recipes.findAll();
    return recipes.map((recipe) => RecipeDto.fromDomain(recipe));
  }
}
