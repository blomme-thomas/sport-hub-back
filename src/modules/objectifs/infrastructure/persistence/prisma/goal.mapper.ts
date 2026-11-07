import type {
  Prisma,
  Goal as GoalRecord,
} from '../../../../../core/prisma/generated/client.js';
import { Goal } from '../../../domain/entities/goal.entity.js';
import { GoalId } from '../../../domain/value-objects/goal-id.vo.js';
import { TargetTime } from '../../../domain/value-objects/target-time.vo.js';

export class GoalMapper {
  static toDomain(record: GoalRecord): Goal {
    return Goal.reconstitute({
      id: GoalId.create(record.id),
      title: record.title,
      type: record.type,
      targetDate: record.targetDate,
      eventFormat: record.eventFormat,
      targetTime:
        record.targetTimeSeconds === null
          ? null
          : TargetTime.create(record.targetTimeSeconds),
    });
  }

  static toPersistence(goal: Goal): Prisma.GoalUncheckedCreateInput {
    return {
      id: goal.id.toString(),
      title: goal.title,
      type: goal.type,
      targetDate: goal.targetDate,
      eventFormat: goal.eventFormat,
      targetTimeSeconds: goal.targetTime?.seconds() ?? null,
    };
  }
}
