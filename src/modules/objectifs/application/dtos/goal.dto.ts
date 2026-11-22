import type { Goal } from '../../domain/entities/goal.entity.js';
import type { EventFormat } from '../../domain/value-objects/event-format.vo.js';
import type { GoalType } from '../../domain/value-objects/goal-type.vo.js';

export interface CreateGoalCommand {
  title: string;
  type: string;
  targetDate?: string | null;
  eventFormat?: string | null;
  targetTimeSeconds?: number | null;
}

export interface UpdateGoalCommand {
  id: string;
  title?: string;
  type?: string;
  targetDate?: string | null;
  eventFormat?: string | null;
  targetTimeSeconds?: number | null;
}

export interface ListGoalsQuery {
  upcoming?: boolean;
}

export class GoalDto {
  private constructor(
    readonly id: string,
    readonly title: string,
    readonly type: GoalType,
    readonly targetDate: string | null,
    readonly eventFormat: EventFormat | null,
    readonly targetTimeSeconds: number | null,
  ) {}

  static fromDomain(goal: Goal): GoalDto {
    return new GoalDto(
      goal.id.toString(),
      goal.title,
      goal.type,
      goal.targetDate === null
        ? null
        : goal.targetDate.toISOString().slice(0, 10),
      goal.eventFormat,
      goal.targetTime === null ? null : goal.targetTime.seconds(),
    );
  }
}
