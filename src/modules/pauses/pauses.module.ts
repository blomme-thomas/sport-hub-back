import { Module } from '@nestjs/common';
import { CreatePauseUseCase } from './application/use-cases/create-pause.use-case.js';
import { DeletePauseUseCase } from './application/use-cases/delete-pause.use-case.js';
import { ListPausesUseCase } from './application/use-cases/list-pauses.use-case.js';
import { UpdatePauseUseCase } from './application/use-cases/update-pause.use-case.js';
import { PAUSE_REPOSITORY } from './domain/ports/outbound/pause.repository.port.js';
import { PrismaPauseRepositoryAdapter } from './infrastructure/persistence/prisma/pause.repository.adapter.js';
import { PausesController } from './presentation/http/controllers/pauses.controller.js';

@Module({
  controllers: [PausesController],
  providers: [
    CreatePauseUseCase,
    ListPausesUseCase,
    UpdatePauseUseCase,
    DeletePauseUseCase,
    { provide: PAUSE_REPOSITORY, useClass: PrismaPauseRepositoryAdapter },
  ],
  exports: [ListPausesUseCase],
})
export class PausesModule {}
