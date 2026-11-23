import { Inject, Injectable } from '@nestjs/common';
import { PlannedMealNotFoundError } from '../../domain/errors/planned-meal-not-found.error.js';
import {
  type IPlannedMealRepository,
  PLANNED_MEAL_REPOSITORY,
} from '../../domain/ports/outbound/planned-meal.repository.port.js';
import { PlannedMealId } from '../../domain/value-objects/planned-meal-id.vo.js';
import {
  type MovePlannedMealCommand,
  PlannedMealDto,
} from '../dtos/planned-meal.dto.js';

@Injectable()
export class MovePlannedMealUseCase {
  constructor(
    @Inject(PLANNED_MEAL_REPOSITORY)
    private readonly plannedMeals: IPlannedMealRepository,
  ) {}

  /**
   * Déplace un repas planifié vers une autre date ou un autre repas ; l'identifiant est conservé.
   *
   * @throws PlannedMealNotFoundError si le repas n'existe pas.
   * @throws InvalidPlannedMealError si la date ou le repas sont invalides.
   */
  async execute(command: MovePlannedMealCommand): Promise<PlannedMealDto> {
    const current = await this.plannedMeals.findById(
      PlannedMealId.from(command.id),
    );
    if (current === null) {
      throw new PlannedMealNotFoundError();
    }
    const moved = current.move({
      date: command.date,
      mealTag: command.mealTag,
    });
    await this.plannedMeals.save(moved);
    return PlannedMealDto.fromDomain(moved);
  }
}
