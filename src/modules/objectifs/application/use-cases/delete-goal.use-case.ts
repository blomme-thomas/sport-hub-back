import { Inject, Injectable } from '@nestjs/common';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found.error.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import { GoalId } from '../../domain/value-objects/goal-id.vo.js';

@Injectable()
export class DeleteGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goals: IGoalRepository,
  ) {}

  /**
   * Supprime l'objectif.
   *
   * @throws GoalNotFoundError si l'objectif n'existe pas.
   * @throws InvalidGoalError si l'identifiant n'est pas un UUID.
   */
  async execute(id: string): Promise<void> {
    const goalId = GoalId.create(id);
    const goal = await this.goals.findById(goalId);
    if (goal === null) {
      throw new GoalNotFoundError();
    }
    await this.goals.delete(goalId);
  }
}
