import { Injectable } from '@nestjs/common';
import {
  ActivityNotFoundError,
  GetActivityDetailUseCase,
} from '../../../garmin-sync/index.js';
import type { ISessionActivityMetrics } from '../../domain/ports/outbound/session-activity-metrics.port.js';
import type { ActivityAchievementInput } from '../../domain/services/session-achievement.js';

@Injectable()
export class GarminSessionActivityMetricsAdapter implements ISessionActivityMetrics {
  constructor(private readonly activities: GetActivityDetailUseCase) {}

  async findByActivityId(
    activityId: string,
  ): Promise<ActivityAchievementInput | null> {
    try {
      const detail = await this.activities.execute(activityId);
      return {
        distanceMeters: detail.distanceMeters,
        durationSeconds: detail.durationSeconds,
        hrTimeInZone: detail.hrTimeInZone,
      };
    } catch (error) {
      if (error instanceof ActivityNotFoundError) {
        return null;
      }
      throw error;
    }
  }
}
