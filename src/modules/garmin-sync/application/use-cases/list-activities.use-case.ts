import { Inject, Injectable } from '@nestjs/common';
import {
  ACTIVITY_LIST_READ_MODEL,
  type IActivityListReadModel,
} from '../../domain/ports/outbound/activity-list.read-model.port.js';
import type {
  ActivityListDto,
  ActivityListQuery,
} from '../dtos/activity-list.dto.js';

@Injectable()
export class ListActivitiesUseCase {
  constructor(
    @Inject(ACTIVITY_LIST_READ_MODEL)
    private readonly readModel: IActivityListReadModel,
  ) {}

  /**
   * Renvoie une page des activités synchronisées en résumé, avec le total des activités correspondant aux filtres.
   * Un filtre absent ne contraint pas la liste.
   */
  async execute(query: ActivityListQuery): Promise<ActivityListDto> {
    const page = await this.readModel.list({
      page: query.page,
      pageSize: query.pageSize,
      from: query.from ?? null,
      to: query.to ?? null,
      type: query.type ?? null,
    });
    return {
      items: page.items.map((item) => ({
        id: item.id,
        garminActivityId: item.garminActivityId,
        type: item.type,
        startedAt: item.startedAt,
        durationSeconds: item.durationSeconds,
        distanceMeters: item.distanceMeters,
        averageHeartRate: item.averageHeartRate,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
    };
  }
}
