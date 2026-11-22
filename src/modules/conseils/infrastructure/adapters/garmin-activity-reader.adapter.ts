import { Injectable } from '@nestjs/common';
import { GetActivityUseCase } from '../../../garmin-sync/index.js';
import type {
  ActivityReference,
  IActivityReader,
} from '../../domain/ports/outbound/conseils.ports.js';

@Injectable()
export class GarminActivityReaderAdapter implements IActivityReader {
  constructor(private readonly activities: GetActivityUseCase) {}

  async findActivity(id: string): Promise<ActivityReference | null> {
    const activity = await this.activities.execute(id);
    if (activity === null) {
      return null;
    }
    return {
      id: activity.id,
      type: activity.type,
      startedAt: activity.startedAt,
      durationSeconds: activity.durationSeconds,
      distanceMeters: activity.distanceMeters,
    };
  }
}
