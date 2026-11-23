import { Inject, Injectable } from '@nestjs/common';
import {
  type IPlannedMealRepository,
  PLANNED_MEAL_REPOSITORY,
} from '../../domain/ports/outbound/planned-meal.repository.port.js';
import { IsoWeek } from '../../domain/value-objects/iso-week.vo.js';
import { PlannedMealDto } from '../dtos/planned-meal.dto.js';

@Injectable()
export class ListPlannedMealsUseCase {
  constructor(
    @Inject(PLANNED_MEAL_REPOSITORY)
    private readonly plannedMeals: IPlannedMealRepository,
  ) {}

  /**
   * Renvoie les repas planifiés d'une semaine ISO (`AAAA-Www`), du lundi au dimanche.
   *
   * @throws InvalidPlannedMealError si la semaine est invalide.
   */
  async execute(query: { week: string }): Promise<PlannedMealDto[]> {
    const week = IsoWeek.create(query.week);
    const plannedMeals = await this.plannedMeals.findBetween(
      week.start,
      week.end,
    );
    return plannedMeals.map((plannedMeal) =>
      PlannedMealDto.fromDomain(plannedMeal),
    );
  }
}
