import { Module } from '@nestjs/common';
import { DisciplineExistsUseCase } from './application/use-cases/discipline-exists.use-case.js';
import { ListDisciplinesUseCase } from './application/use-cases/list-disciplines.use-case.js';
import { RecordDisciplineAppearancesUseCase } from './application/use-cases/record-discipline-appearances.use-case.js';
import { RenameDisciplineUseCase } from './application/use-cases/rename-discipline.use-case.js';
import { DISCIPLINE_REPOSITORY } from './domain/ports/outbound/discipline.repository.port.js';
import { DISCIPLINES_CLOCK } from './domain/ports/outbound/disciplines-clock.port.js';
import { PrismaDisciplineRepositoryAdapter } from './infrastructure/persistence/prisma/discipline.repository.adapter.js';
import { DisciplinesController } from './presentation/http/controllers/disciplines.controller.js';

@Module({
  controllers: [DisciplinesController],
  providers: [
    ListDisciplinesUseCase,
    RenameDisciplineUseCase,
    RecordDisciplineAppearancesUseCase,
    DisciplineExistsUseCase,
    {
      provide: DISCIPLINE_REPOSITORY,
      useClass: PrismaDisciplineRepositoryAdapter,
    },
    { provide: DISCIPLINES_CLOCK, useValue: () => new Date() },
  ],
  exports: [
    RecordDisciplineAppearancesUseCase,
    DisciplineExistsUseCase,
    ListDisciplinesUseCase,
  ],
})
export class DisciplinesModule {}
