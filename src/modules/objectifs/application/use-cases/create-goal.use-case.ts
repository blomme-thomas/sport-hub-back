import { Inject, Injectable } from '@nestjs/common';
import { Goal } from '../../domain/entities/goal.entity.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import { TargetTime } from '../../domain/value-objects/target-time.vo.js';
import { type CreateGoalCommand, GoalDto } from '../dtos/goal.dto.js';

@Injectable()
export class CreateGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goals: IGoalRepository,
  ) {}

  /**
   * Crée et enregistre un objectif. Le format et le temps cible ne sont acceptés que pour un événement.
   *
   * @throws InvalidGoalError si un champ est mal formé, hors des valeurs autorisées, ou posé sur un objectif qui n'est pas un événement.
   * @throws InvalidTargetTimeError si le temps cible n'est pas un entier strictement positif.
   */
  async execute(command: CreateGoalCommand): Promise<GoalDto> {
    const goal = Goal.create({
      title: command.title,
      type: command.type,
      targetDate:
        command.targetDate === undefined || command.targetDate === null
          ? null
          : new Date(`${command.targetDate}T00:00:00.000Z`),
      eventFormat: command.eventFormat ?? null,
      targetTime:
        command.targetTimeSeconds === undefined ||
        command.targetTimeSeconds === null
          ? null
          : TargetTime.create(command.targetTimeSeconds),
    });
    await this.goals.save(goal);
    return GoalDto.fromDomain(goal);
  }
}
