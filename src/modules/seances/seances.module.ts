import { Module } from '@nestjs/common';
import { DisciplinesModule } from '../disciplines/disciplines.module.js';
import { CreateSessionUseCase } from './application/use-cases/create-session.use-case.js';
import { DeleteSessionUseCase } from './application/use-cases/delete-session.use-case.js';
import { GetSessionUseCase } from './application/use-cases/get-session.use-case.js';
import { ListSessionsUseCase } from './application/use-cases/list-sessions.use-case.js';
import { ReplaceSessionModulesUseCase } from './application/use-cases/replace-session-modules.use-case.js';
import { UpdateSessionUseCase } from './application/use-cases/update-session.use-case.js';
import { DISCIPLINE_CATALOG } from './domain/ports/outbound/discipline-catalog.port.js';
import { SEANCES_CLOCK } from './domain/ports/outbound/seances-clock.port.js';
import { SESSION_REPOSITORY } from './domain/ports/outbound/session.repository.port.js';
import { DisciplinesCatalogAdapter } from './infrastructure/adapters/disciplines-catalog.adapter.js';
import { PrismaSessionRepositoryAdapter } from './infrastructure/persistence/prisma/session.repository.adapter.js';
import { SessionsController } from './presentation/http/controllers/sessions.controller.js';

@Module({
  imports: [DisciplinesModule],
  controllers: [SessionsController],
  providers: [
    CreateSessionUseCase,
    ListSessionsUseCase,
    GetSessionUseCase,
    UpdateSessionUseCase,
    ReplaceSessionModulesUseCase,
    DeleteSessionUseCase,
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepositoryAdapter },
    { provide: DISCIPLINE_CATALOG, useClass: DisciplinesCatalogAdapter },
    { provide: SEANCES_CLOCK, useValue: () => new Date() },
  ],
})
export class SeancesModule {}
