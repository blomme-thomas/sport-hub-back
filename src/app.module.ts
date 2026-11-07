import { Module } from '@nestjs/common';
import { AppConfigModule } from './core/config/app-config.module.js';
import { HealthModule } from './core/health/health.module.js';
import { GarminSyncModule } from './modules/garmin-sync/garmin-sync.module.js';
import { TrainingStatsModule } from './modules/training-stats/training-stats.module.js';
import { PrismaModule } from './core/prisma/prisma.module.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    GarminSyncModule,
    TrainingStatsModule,
  ],
})
export class AppModule {}
