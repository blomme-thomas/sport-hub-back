import { Injectable } from '@nestjs/common';
import {
  ActivityNotFoundError,
  GetActivityDetailUseCase,
  ListActivitiesUseCase,
  type ActivitySummaryDto,
} from '../../../garmin-sync/index.js';
import type {
  IWeekActivitiesSource,
  WeekActivity,
  WeekActivityDetail,
} from '../../domain/ports/outbound/week-export.ports.js';

const PAGE_SIZE = 100;

@Injectable()
export class GarminWeekActivitiesAdapter implements IWeekActivitiesSource {
  constructor(
    private readonly list: ListActivitiesUseCase,
    private readonly detail: GetActivityDetailUseCase,
  ) {}

  async findBetween(from: Date, toExclusive: Date): Promise<WeekActivity[]> {
    const to = new Date(toExclusive.getTime() - 1);
    const activities: WeekActivity[] = [];
    for (let page = 1; ; page++) {
      const result = await this.list.execute({
        page,
        pageSize: PAGE_SIZE,
        from,
        to,
      });
      activities.push(...result.items.map(toWeekActivity));
      if (result.items.length === 0 || page * PAGE_SIZE >= result.total) {
        return activities;
      }
    }
  }

  async findDetail(id: string): Promise<WeekActivityDetail | null> {
    try {
      const detail = await this.detail.execute(id);
      return {
        ...toWeekActivity(detail),
        hrTimeInZone: detail.hrTimeInZone,
        perceivedEffort: detail.perceivedEffort,
      };
    } catch (error) {
      if (error instanceof ActivityNotFoundError) {
        return null;
      }
      throw error;
    }
  }
}

function toWeekActivity(
  activity: Pick<
    ActivitySummaryDto,
    | 'id'
    | 'type'
    | 'startedAt'
    | 'durationSeconds'
    | 'distanceMeters'
    | 'averageHeartRate'
  >,
): WeekActivity {
  return {
    id: activity.id,
    type: activity.type,
    startedAt: activity.startedAt,
    durationSeconds: activity.durationSeconds,
    distanceMeters: activity.distanceMeters,
    averageHeartRate: activity.averageHeartRate,
  };
}
