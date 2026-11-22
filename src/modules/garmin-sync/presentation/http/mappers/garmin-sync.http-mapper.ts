import type { SyncGarminActivitiesResultDto } from '../../../application/dtos/sync-garmin-activities-result.dto.js';
import { SyncGarminActivitiesResponseDto } from '../dtos/sync-garmin-activities.response.dto.js';

export class GarminSyncHttpMapper {
  static toResponse(
    result: SyncGarminActivitiesResultDto,
  ): SyncGarminActivitiesResponseDto {
    return Object.assign(new SyncGarminActivitiesResponseDto(), result);
  }
}
