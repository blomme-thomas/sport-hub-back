import { Inject, Injectable } from '@nestjs/common';
import { Recipe } from '../../domain/entities/recipe.entity.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import {
  type IRecipeRepository,
  RECIPE_REPOSITORY,
} from '../../domain/ports/outbound/recipe.repository.port.js';
import { RecipeName } from '../../domain/value-objects/recipe-name.vo.js';
import { type CreateRecipeCommand, RecipeDto } from '../dtos/recipe.dto.js';
import { checkRecipeComposition } from './check-recipe-composition.js';

@Injectable()
export class CreateRecipeUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipes: IRecipeRepository,
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * Crée et enregistre une recette ; aucun composant n'est obligatoire.
   *
   * @throws InvalidRecipeError si le nom, les tags ou la composition sont invalides.
   */
  async execute(command: CreateRecipeCommand): Promise<RecipeDto> {
    const items = command.items ?? [];
    await checkRecipeComposition(this.foods, items);
    const recipe = Recipe.create({
      name: RecipeName.create(command.name),
      mealTags: command.mealTags,
      items,
    });
    await this.recipes.save(recipe);
    return RecipeDto.fromDomain(recipe);
  }
}
