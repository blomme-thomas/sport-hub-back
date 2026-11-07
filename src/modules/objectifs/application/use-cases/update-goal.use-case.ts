import { Inject, Injectable } from '@nestjs/common';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found.error.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import { GoalId } from '../../domain/value-objects/goal-id.vo.js';
import { TargetTime } from '../../domain/value-objects/target-time.vo.js';
import { type UpdateGoalCommand, GoalDto } from '../dtos/goal.dto.js';

@Injectable()
export class UpdateGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goals: IGoalRepository,
  ) {}

  /**
   * Modifie un objectif existant : les champs absents gardent leur valeur ; null efface la date, le format ou le temps cible.
   * Aucune contrainte de date passée. Le type peut changer, mais un format ou un temps cible restant posé sur un type autre que evenement est refusé.
   *
   * @throws GoalNotFoundError si l'objectif n'existe pas.
   * @throws InvalidGoalError si une valeur est mal formée ou viole un invariant fusionné.
   * @throws InvalidTargetTimeError si le temps cible n'est pas un entier strictement positif.
   */
  async execute(command: UpdateGoalCommand): Promise<GoalDto> {
    const goal = await this.goals.findById(GoalId.create(command.id));
    if (goal === null) {
      throw new GoalNotFoundError();
    }
    const updated = goal.change({
      title: command.title,
      type: command.type,
      targetDate:
        command.targetDate === undefined
          ? undefined
          : command.targetDate === null
            ? null
            : new Date(`${command.targetDate}T00:00:00.000Z`),
      eventFormat: command.eventFormat,
      targetTime:
        command.targetTimeSeconds === undefined
          ? undefined
          : command.targetTimeSeconds === null
            ? null
            : TargetTime.create(command.targetTimeSeconds),
    });
    await this.goals.save(updated);
    return GoalDto.fromDomain(updated);
  }
}
