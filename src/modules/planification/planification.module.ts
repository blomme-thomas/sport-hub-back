import { Module } from '@nestjs/common';
import { CreneauxModule } from '../creneaux/creneaux.module.js';
import { SeancesModule } from '../seances/seances.module.js';
import { ComputeFreeSlotCapacityUseCase } from './application/use-cases/compute-free-slot-capacity.use-case.js';
import { PLANNING_CLOCK } from './domain/ports/outbound/planning-clock.port.js';
import { SESSIONS_PROVIDER } from './domain/ports/outbound/sessions.provider.port.js';
import { SLOT_OCCURRENCES_PROVIDER } from './domain/ports/outbound/slot-occurrences.provider.port.js';
import { SeancesSessionsAdapter } from './infrastructure/adapters/sessions.adapter.js';
import { CreneauxOccurrencesAdapter } from './infrastructure/adapters/slot-occurrences.adapter.js';
import { parisToday } from './infrastructure/clock/paris-planning-clock.js';

@Module({
  imports: [CreneauxModule, SeancesModule],
  providers: [
    ComputeFreeSlotCapacityUseCase,
    {
      provide: SLOT_OCCURRENCES_PROVIDER,
      useClass: CreneauxOccurrencesAdapter,
    },
    { provide: SESSIONS_PROVIDER, useClass: SeancesSessionsAdapter },
    { provide: PLANNING_CLOCK, useValue: parisToday },
  ],
  exports: [ComputeFreeSlotCapacityUseCase],
})
export class PlanificationModule {}
