import { Module } from '@nestjs/common';
import { HttpClientModule } from '../../core/http/http-client.module.js';
import { SyncGarminActivitiesUseCase } from './application/use-cases/sync-garmin-activities.use-case.js';
import { ACTIVITY_REPOSITORY } from './domain/ports/outbound/activity.repository.port.js';
import { GARMIN_CONNECT_CLIENT } from './domain/ports/outbound/garmin-connect-client.port.js';
import { GarminConnectAdapter } from './infrastructure/adapters/garmin-connect.adapter.js';
import { GarminPersonalApiTokenProvider } from './infrastructure/adapters/garmin-personal-api-token.provider.js';
import { PrismaActivityRepositoryAdapter } from './infrastructure/persistence/prisma/activity.repository.adapter.js';
import { GarminSyncController } from './presentation/http/controllers/garmin-sync.controller.js';

@Module({
  imports: [HttpClientModule],
  controllers: [GarminSyncController],
  providers: [
    SyncGarminActivitiesUseCase,
    GarminPersonalApiTokenProvider,
    { provide: GARMIN_CONNECT_CLIENT, useClass: GarminConnectAdapter },
    { provide: ACTIVITY_REPOSITORY, useClass: PrismaActivityRepositoryAdapter },
  ],
  exports: [GarminPersonalApiTokenProvider],
})
export class GarminSyncModule {}
