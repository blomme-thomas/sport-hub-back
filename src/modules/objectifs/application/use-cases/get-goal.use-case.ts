import { Inject, Injectable } from '@nestjs/common';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found.error.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import { GoalId } from '../../domain/value-objects/goal-id.vo.js';
import { GoalDto } from '../dtos/goal.dto.js';

@Injectable()
export class GetGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goals: IGoalRepository,
  ) {}

  /**
   * Renvoie l'objectif demandé.
   *
   * @throws GoalNotFoundError si l'objectif n'existe pas.
   * @throws InvalidGoalError si l'identifiant n'est pas un UUID.
   */
  async execute(id: string): Promise<GoalDto> {
    const goal = await this.goals.findById(GoalId.create(id));
    if (goal === null) {
      throw new GoalNotFoundError();
    }
    return GoalDto.fromDomain(goal);
  }
}
