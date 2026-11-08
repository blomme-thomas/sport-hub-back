import { Module } from '@nestjs/common';
import { AppConfigModule } from './core/config/app-config.module.js';
import { HealthModule } from './core/health/health.module.js';
import { CreneauxModule } from './modules/creneaux/creneaux.module.js';
import { DisciplinesModule } from './modules/disciplines/disciplines.module.js';
import { ObjectifsModule } from './modules/objectifs/objectifs.module.js';
import { GarminSyncModule } from './modules/garmin-sync/garmin-sync.module.js';
import { TrainingStatsModule } from './modules/training-stats/training-stats.module.js';
import { WorkoutGenerationModule } from './modules/workout-generation/workout-generation.module.js';
import { SeancesModule } from './modules/seances/seances.module.js';
import { PlanificationModule } from './modules/planification/planification.module.js';
import { ConseilsModule } from './modules/conseils/conseils.module.js';
import { PausesModule } from './modules/pauses/pauses.module.js';
import { PrismaModule } from './core/prisma/prisma.module.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    GarminSyncModule,
    TrainingStatsModule,
    WorkoutGenerationModule,
    CreneauxModule,
    ObjectifsModule,
    DisciplinesModule,
    SeancesModule,
    PlanificationModule,
    ConseilsModule,
    PausesModule,
  ],
})
export class AppModule {}
