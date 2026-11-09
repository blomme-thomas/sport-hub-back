import { Module } from '@nestjs/common';
import { DisciplinesModule } from '../disciplines/index.js';
import { GarminSyncModule } from '../garmin-sync/index.js';
import { CreateSessionUseCase } from './application/use-cases/create-session.use-case.js';
import { DeleteSessionUseCase } from './application/use-cases/delete-session.use-case.js';
import { GetSessionUseCase } from './application/use-cases/get-session.use-case.js';
import { GetSessionForActivityUseCase } from './application/use-cases/get-session-for-activity.use-case.js';
import { LinkSessionActivityUseCase } from './application/use-cases/link-session-activity.use-case.js';
import { ListSessionsUseCase } from './application/use-cases/list-sessions.use-case.js';
import { ListSessionOccurrencesUseCase } from './application/use-cases/list-session-occurrences.use-case.js';
import { ReconcileSessionsUseCase } from './application/use-cases/reconcile-sessions.use-case.js';
import { ReplaceSessionModulesUseCase } from './application/use-cases/replace-session-modules.use-case.js';
import { UnlinkSessionActivityUseCase } from './application/use-cases/unlink-session-activity.use-case.js';
import { UpdateSessionUseCase } from './application/use-cases/update-session.use-case.js';
import { ACTIVITY_CATALOG } from './domain/ports/outbound/activity-catalog.port.js';
import { DISCIPLINE_CATALOG } from './domain/ports/outbound/discipline-catalog.port.js';
import { SEANCES_CLOCK } from './domain/ports/outbound/seances-clock.port.js';
import { SESSION_REPOSITORY } from './domain/ports/outbound/session.repository.port.js';
import { GarminActivityCatalogAdapter } from './infrastructure/adapters/garmin-activity-catalog.adapter.js';
import { DisciplinesCatalogAdapter } from './infrastructure/adapters/disciplines-catalog.adapter.js';
import { PrismaSessionRepositoryAdapter } from './infrastructure/persistence/prisma/session.repository.adapter.js';
import { SessionsController } from './presentation/http/controllers/sessions.controller.js';

@Module({
  imports: [DisciplinesModule, GarminSyncModule],
  controllers: [SessionsController],
  providers: [
    CreateSessionUseCase,
    ListSessionsUseCase,
    ListSessionOccurrencesUseCase,
    GetSessionUseCase,
    GetSessionForActivityUseCase,
    UpdateSessionUseCase,
    ReplaceSessionModulesUseCase,
    DeleteSessionUseCase,
    ReconcileSessionsUseCase,
    LinkSessionActivityUseCase,
    UnlinkSessionActivityUseCase,
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepositoryAdapter },
    { provide: DISCIPLINE_CATALOG, useClass: DisciplinesCatalogAdapter },
    { provide: ACTIVITY_CATALOG, useClass: GarminActivityCatalogAdapter },
    { provide: SEANCES_CLOCK, useValue: () => new Date() },
  ],
  exports: [
    ListSessionsUseCase,
    CreateSessionUseCase,
    GetSessionForActivityUseCase,
  ],
})
export class SeancesModule {}
