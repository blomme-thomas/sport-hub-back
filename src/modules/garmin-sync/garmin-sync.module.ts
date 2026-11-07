import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpClientModule } from '../../core/http/http-client.module.js';
import { DisciplinesModule } from '../disciplines/disciplines.module.js';
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
  controllers: [GarminSyncController, ActivitiesController],
  providers: [
    SyncGarminActivitiesUseCase,
    ListActivitiesUseCase,
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
  exports: [GarminPersonalApiTokenProvider],
})
export class GarminSyncModule {}
