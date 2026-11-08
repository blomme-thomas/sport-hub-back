import { Module } from '@nestjs/common';
import { CreateSlotUseCase } from './application/use-cases/create-slot.use-case.js';
import { DeleteSlotUseCase } from './application/use-cases/delete-slot.use-case.js';
import { ListSlotOccurrencesUseCase } from './application/use-cases/list-slot-occurrences.use-case.js';
import { UpdateSlotUseCase } from './application/use-cases/update-slot.use-case.js';
import { SLOT_REPOSITORY } from './domain/ports/outbound/slot.repository.port.js';
import { PrismaSlotRepositoryAdapter } from './infrastructure/persistence/prisma/slot.repository.adapter.js';
import { SlotsController } from './presentation/http/controllers/slots.controller.js';

@Module({
  controllers: [SlotsController],
  providers: [
    CreateSlotUseCase,
    UpdateSlotUseCase,
    DeleteSlotUseCase,
    ListSlotOccurrencesUseCase,
    { provide: SLOT_REPOSITORY, useClass: PrismaSlotRepositoryAdapter },
  ],
  exports: [ListSlotOccurrencesUseCase],
})
export class CreneauxModule {}
