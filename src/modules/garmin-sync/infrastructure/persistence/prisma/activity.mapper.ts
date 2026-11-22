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
      metrics: {
        calories: record.calories,
        elevationGainMeters: record.elevationGainMeters,
        averageHeartRate: record.averageHeartRate,
        hrTimeInZone: [
          record.hrTimeInZone1,
          record.hrTimeInZone2,
          record.hrTimeInZone3,
          record.hrTimeInZone4,
          record.hrTimeInZone5,
        ],
      },
      sourcePayload: record.rawPayload,
    });
  }

  static toPersistence(activity: Activity): Prisma.ActivityCreateInput {
    const metrics = activity.metrics;
    const [zone1, zone2, zone3, zone4, zone5] = metrics.hrTimeInZone;
    return {
      garminActivityId: activity.garminActivityId.toString(),
      type: activity.type,
      startedAt: activity.startedAt,
      durationSeconds: activity.durationSeconds,
      distanceMeters: activity.distanceMeters,
      calories: metrics.calories,
      elevationGainMeters: metrics.elevationGainMeters,
      averageHeartRate: metrics.averageHeartRate,
      hrTimeInZone1: zone1,
      hrTimeInZone2: zone2,
      hrTimeInZone3: zone3,
      hrTimeInZone4: zone4,
      hrTimeInZone5: zone5,
      rawPayload: activity.sourcePayload as Prisma.InputJsonValue,
    };
  }
}
