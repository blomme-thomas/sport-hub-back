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
import { RecipeName } from '../../domain/value-objects/recipe-name.vo.js';
import { type UpdateRecipeCommand, RecipeDto } from '../dtos/recipe.dto.js';
import { checkRecipeComposition } from './check-recipe-composition.js';

@Injectable()
export class UpdateRecipeUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipes: IRecipeRepository,
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * Modifie une recette ; une composition fournie remplace l'ensemble des items.
   *
   * @throws RecipeNotFoundError si la recette n'existe pas.
   * @throws InvalidRecipeError si les valeurs ou la composition sont invalides.
   */
  async execute(command: UpdateRecipeCommand): Promise<RecipeDto> {
    const current = await this.recipes.findById(RecipeId.from(command.id));
    if (current === null) {
      throw new RecipeNotFoundError();
    }
    if (command.items !== undefined) {
      await checkRecipeComposition(this.foods, command.items);
    }
    const recipe = current.change({
      name:
        command.name === undefined
          ? undefined
          : RecipeName.create(command.name),
      mealTags: command.mealTags,
      items: command.items,
    });
    await this.recipes.save(recipe);
    return RecipeDto.fromDomain(recipe);
  }
}
