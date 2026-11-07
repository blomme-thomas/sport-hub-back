import type {
  Activity as ActivityRecord,
  Prisma,
} from '../../../../../core/prisma/generated/client.js';
import { Activity } from '../../../domain/entities/activity.entity.js';
import { GarminActivityId } from '../../../domain/value-objects/garmin-activity-id.vo.js';

export class ActivityMapper {
  static toDomain(record: ActivityRecord): Activity {
    return Activity.reconstitute({
      garminActivityId: GarminActivityId.create(record.garminActivityId),
      type: record.type,
      startedAt: record.startedAt,
      durationSeconds: record.durationSeconds,
      distanceMeters: record.distanceMeters,
      sourcePayload: record.rawPayload,
    });
  }

  static toPersistence(activity: Activity): Prisma.ActivityCreateInput {
    return {
      garminActivityId: activity.garminActivityId.toString(),
      type: activity.type,
      startedAt: activity.startedAt,
      durationSeconds: activity.durationSeconds,
      distanceMeters: activity.distanceMeters,
      rawPayload: activity.sourcePayload as Prisma.InputJsonValue,
    };
  }
}
