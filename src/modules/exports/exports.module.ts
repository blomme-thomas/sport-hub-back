import { Module } from '@nestjs/common';
import { GarminSyncModule } from '../garmin-sync/index.js';
import { SeancesModule } from '../seances/index.js';
import { TrainingStatsModule } from '../training-stats/index.js';
import { ExportMonthUseCase } from './application/use-cases/export-month.use-case.js';
import { ExportSessionUseCase } from './application/use-cases/export-session.use-case.js';
import { ExportWeekUseCase } from './application/use-cases/export-week.use-case.js';
import { SESSION_EXPORT_SOURCE } from './domain/ports/outbound/session-export.port.js';
import {
  WEEK_ACTIVITIES_SOURCE,
  WEEK_SESSIONS_SOURCE,
  WEEK_VOLUMES_SOURCE,
} from './domain/ports/outbound/week-export.ports.js';
import { GarminWeekActivitiesAdapter } from './infrastructure/adapters/garmin-week-activities.adapter.js';
import { SeancesSessionExportAdapter } from './infrastructure/adapters/seances-session-export.adapter.js';
import { SeancesWeekSessionsAdapter } from './infrastructure/adapters/seances-week-sessions.adapter.js';
import { TrainingStatsWeekVolumesAdapter } from './infrastructure/adapters/training-stats-week-volumes.adapter.js';
import { MonthExportsController } from './presentation/http/controllers/month-exports.controller.js';
import { SessionExportsController } from './presentation/http/controllers/session-exports.controller.js';
import { WeekExportsController } from './presentation/http/controllers/week-exports.controller.js';

@Module({
  imports: [SeancesModule, GarminSyncModule, TrainingStatsModule],
  controllers: [
    WeekExportsController,
    MonthExportsController,
    SessionExportsController,
  ],
  providers: [
    ExportWeekUseCase,
    ExportMonthUseCase,
    ExportSessionUseCase,
    { provide: SESSION_EXPORT_SOURCE, useClass: SeancesSessionExportAdapter },
    { provide: WEEK_SESSIONS_SOURCE, useClass: SeancesWeekSessionsAdapter },
    { provide: WEEK_ACTIVITIES_SOURCE, useClass: GarminWeekActivitiesAdapter },
    { provide: WEEK_VOLUMES_SOURCE, useClass: TrainingStatsWeekVolumesAdapter },
  ],
})
export class ExportsModule {}
