import { Inject, Injectable } from '@nestjs/common';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import { type ListGoalsQuery, GoalDto } from '../dtos/goal.dto.js';

@Injectable()
export class ListGoalsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goals: IGoalRepository,
  ) {}

  /**
   * Liste les objectifs triés par date cible croissante, sans date en dernier.
   * Avec `upcoming: true`, ne renvoie que les objectifs dont la date cible est aujourd'hui (jour UTC) ou postérieure.
   */
  async execute(query: ListGoalsQuery): Promise<GoalDto[]> {
    const goals = await this.goals.findAll({
      upcomingFrom:
        query.upcoming === true ? startOfUtcDay(new Date()) : undefined,
    });
    return goals.map((goal) => GoalDto.fromDomain(goal));
  }
}

function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
