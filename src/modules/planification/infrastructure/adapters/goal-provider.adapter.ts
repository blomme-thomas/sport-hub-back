import { Injectable } from '@nestjs/common';
import { GetGoalUseCase } from '../../../objectifs/index.js';
import type {
  IGoalProvider,
  PlanningGoal,
} from '../../domain/ports/outbound/goal-provider.port.js';

@Injectable()
export class ObjectifsGoalProvider implements IGoalProvider {
  constructor(private readonly goals: GetGoalUseCase) {}

  async findGoal(id: string): Promise<PlanningGoal> {
    const goal = await this.goals.execute(id);
    return {
      title: goal.title,
      type: goal.type,
      targetDate: goal.targetDate,
      eventFormat: goal.eventFormat,
      targetTimeSeconds: goal.targetTimeSeconds,
    };
  }
}
