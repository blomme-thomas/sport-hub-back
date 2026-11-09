import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpClientModule } from '../../core/http/http-client.module.js';
import { DisciplinesModule } from '../disciplines/index.js';
import { GetActivityUseCase } from './application/use-cases/get-activity.use-case.js';
import { GetGarminProfileUseCase } from './application/use-cases/get-garmin-profile.use-case.js';
import { GetHeartRateZonesUseCase } from './application/use-cases/get-heart-rate-zones.use-case.js';
import { GetRecoveryUseCase } from './application/use-cases/get-recovery.use-case.js';
import { GetDailyCaloriesUseCase } from './application/use-cases/get-daily-calories.use-case.js';
import { HeartRateZonesController } from './presentation/http/controllers/heart-rate-zones.controller.js';
import { RecoveryController } from './presentation/http/controllers/recovery.controller.js';
import { ProfileController } from './presentation/http/controllers/profile.controller.js';
import { ListActivitiesUseCase } from './application/use-cases/list-activities.use-case.js';
import { SyncGarminActivitiesUseCase } from './application/use-cases/sync-garmin-activities.use-case.js';
import { ACTIVITY_LIST_READ_MODEL } from './domain/ports/outbound/activity-list.read-model.port.js';
import { ACTIVITY_REPOSITORY } from './domain/ports/outbound/activity.repository.port.js';
import { DISCIPLINE_REGISTRY } from './domain/ports/outbound/discipline-registry.port.js';
import { GARMIN_CONNECT_CLIENT } from './domain/ports/outbound/garmin-connect-client.port.js';
import { DisciplinesRegistryAdapter } from './infrastructure/adapters/disciplines-registry.adapter.js';
import { GarminConnectAdapter } from './infrastructure/adapters/garmin-connect.adapter.js';
import { GarminPersonalApiTokenProvider } from './infrastructure/adapters/garmin-personal-api-token.provider.js';
import { GarminSyncScheduler } from './infrastructure/scheduler/garmin-sync.scheduler.js';
import { PrismaActivityListReadModel } from './infrastructure/persistence/prisma/activity-list.read-model.js';
import { PrismaActivityRepositoryAdapter } from './infrastructure/persistence/prisma/activity.repository.adapter.js';
import { ActivitiesController } from './presentation/http/controllers/activities.controller.js';
import { GarminSyncController } from './presentation/http/controllers/garmin-sync.controller.js';

@Module({
  imports: [HttpClientModule, ScheduleModule.forRoot(), DisciplinesModule],
  controllers: [
    GarminSyncController,
    ActivitiesController,
    ProfileController,
    HeartRateZonesController,
    RecoveryController,
  ],
  providers: [
    SyncGarminActivitiesUseCase,
    ListActivitiesUseCase,
    GetActivityUseCase,
    GetGarminProfileUseCase,
    GetHeartRateZonesUseCase,
    GetRecoveryUseCase,
    GetDailyCaloriesUseCase,
    GarminSyncScheduler,
    GarminPersonalApiTokenProvider,
    { provide: GARMIN_CONNECT_CLIENT, useClass: GarminConnectAdapter },
    { provide: DISCIPLINE_REGISTRY, useClass: DisciplinesRegistryAdapter },
    { provide: ACTIVITY_REPOSITORY, useClass: PrismaActivityRepositoryAdapter },
    {
      provide: ACTIVITY_LIST_READ_MODEL,
      useClass: PrismaActivityListReadModel,
    },
  ],
  exports: [
    GarminPersonalApiTokenProvider,
    ListActivitiesUseCase,
    GetActivityUseCase,
    GetRecoveryUseCase,
    GetDailyCaloriesUseCase,
    GetHeartRateZonesUseCase,
  ],
})
export class GarminSyncModule {}
