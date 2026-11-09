export { GarminSyncModule } from './garmin-sync.module.js';
export { GetActivityUseCase } from './application/use-cases/get-activity.use-case.js';
export { GetActivityDetailUseCase } from './application/use-cases/get-activity-detail.use-case.js';
export { ActivityNotFoundError } from './domain/errors/activity-not-found.error.js';
export { ListActivitiesUseCase } from './application/use-cases/list-activities.use-case.js';
export type { ActivitySummaryDto } from './application/dtos/activity-list.dto.js';
export { GetRecoveryUseCase } from './application/use-cases/get-recovery.use-case.js';
export { GetHeartRateZonesUseCase } from './application/use-cases/get-heart-rate-zones.use-case.js';
export { GetDailyCaloriesUseCase } from './application/use-cases/get-daily-calories.use-case.js';
export type {
  DailyCaloriesDay,
  RecoveryDay,
  RecoveryRange,
} from './domain/ports/outbound/garmin-connect-client.port.js';
export type { HeartRateZonesDto } from './application/dtos/heart-rate-zones.dto.js';
