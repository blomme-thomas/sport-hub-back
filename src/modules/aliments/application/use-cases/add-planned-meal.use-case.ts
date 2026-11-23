import { Inject, Injectable } from '@nestjs/common';
import { PlannedMeal } from '../../domain/entities/planned-meal.entity.js';
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
import {
  type AddPlannedMealCommand,
  PlannedMealDto,
} from '../dtos/planned-meal.dto.js';

@Injectable()
export class AddPlannedMealUseCase {
  constructor(
    @Inject(PLANNED_MEAL_REPOSITORY)
    private readonly plannedMeals: IPlannedMealRepository,
    @Inject(RECIPE_REPOSITORY)
    private readonly recipes: IRecipeRepository,
  ) {}

  /**
   * Place une recette à une date et pour un repas ; une même recette peut être placée plusieurs fois.
   *
   * @throws RecipeNotFoundError si la recette n'existe pas.
   * @throws InvalidPlannedMealError si la date ou le repas sont invalides.
   */
  async execute(command: AddPlannedMealCommand): Promise<PlannedMealDto> {
    const recipeId = RecipeId.from(command.recipeId);
    if ((await this.recipes.findById(recipeId)) === null) {
      throw new RecipeNotFoundError();
    }
    const plannedMeal = PlannedMeal.create(command);
    await this.plannedMeals.save(plannedMeal);
    return PlannedMealDto.fromDomain(plannedMeal);
  }
}
