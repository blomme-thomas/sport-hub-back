import { Module } from '@nestjs/common';
import { HttpClientModule } from '../../core/http/http-client.module.js';
import { ListActivitiesUseCase } from './application/use-cases/list-activities.use-case.js';
import { SyncGarminActivitiesUseCase } from './application/use-cases/sync-garmin-activities.use-case.js';
import { ACTIVITY_LIST_READ_MODEL } from './domain/ports/outbound/activity-list.read-model.port.js';
import { ACTIVITY_REPOSITORY } from './domain/ports/outbound/activity.repository.port.js';
import { GARMIN_CONNECT_CLIENT } from './domain/ports/outbound/garmin-connect-client.port.js';
import { GarminConnectAdapter } from './infrastructure/adapters/garmin-connect.adapter.js';
import { GarminPersonalApiTokenProvider } from './infrastructure/adapters/garmin-personal-api-token.provider.js';
import { PrismaActivityListReadModel } from './infrastructure/persistence/prisma/activity-list.read-model.js';
import { PrismaActivityRepositoryAdapter } from './infrastructure/persistence/prisma/activity.repository.adapter.js';
import { ActivitiesController } from './presentation/http/controllers/activities.controller.js';
import { GarminSyncController } from './presentation/http/controllers/garmin-sync.controller.js';

@Module({
  imports: [HttpClientModule],
  controllers: [GarminSyncController, ActivitiesController],
  providers: [
    SyncGarminActivitiesUseCase,
    ListActivitiesUseCase,
    GarminPersonalApiTokenProvider,
    { provide: GARMIN_CONNECT_CLIENT, useClass: GarminConnectAdapter },
    { provide: ACTIVITY_REPOSITORY, useClass: PrismaActivityRepositoryAdapter },
    {
      provide: ACTIVITY_LIST_READ_MODEL,
      useClass: PrismaActivityListReadModel,
    },
  ],
  exports: [GarminPersonalApiTokenProvider],
})
export class GarminSyncModule {}
