import { Inject, Injectable } from '@nestjs/common';
import { PlannedMealNotFoundError } from '../../domain/errors/planned-meal-not-found.error.js';
import {
  type IPlannedMealRepository,
  PLANNED_MEAL_REPOSITORY,
} from '../../domain/ports/outbound/planned-meal.repository.port.js';
import { PlannedMealId } from '../../domain/value-objects/planned-meal-id.vo.js';

@Injectable()
export class RemovePlannedMealUseCase {
  constructor(
    @Inject(PLANNED_MEAL_REPOSITORY)
    private readonly plannedMeals: IPlannedMealRepository,
  ) {}

  /**
   * Supprime un repas planifié ; les autres placements de la même recette ne sont pas touchés.
   *
   * @throws PlannedMealNotFoundError si le repas n'existe pas.
   */
  async execute(command: { id: string }): Promise<void> {
    const id = PlannedMealId.from(command.id);
    if ((await this.plannedMeals.findById(id)) === null) {
      throw new PlannedMealNotFoundError();
    }
    await this.plannedMeals.delete(id);
  }
}
