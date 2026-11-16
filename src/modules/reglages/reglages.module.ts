import { Module } from '@nestjs/common';
import { TrainingStatsModule } from '../training-stats/index.js';
import { GetWeeklyTargetProgressUseCase } from './application/use-cases/get-weekly-target-progress.use-case.js';
import {
  GetUserSettingsUseCase,
  UpdateUserSettingsUseCase,
} from './application/use-cases/user-settings.use-cases.js';
import { USER_SETTINGS_REPOSITORY } from './domain/ports/outbound/user-settings.repository.port.js';
import { PrismaUserSettingsRepositoryAdapter } from './infrastructure/persistence/prisma/user-settings.repository.adapter.js';
import { SettingsController } from './presentation/http/controllers/settings.controller.js';

@Module({
  imports: [TrainingStatsModule],
  controllers: [SettingsController],
  providers: [
    GetUserSettingsUseCase,
    UpdateUserSettingsUseCase,
    GetWeeklyTargetProgressUseCase,
    {
      provide: USER_SETTINGS_REPOSITORY,
      useClass: PrismaUserSettingsRepositoryAdapter,
    },
  ],
})
export class ReglagesModule {}
