import { Module } from '@nestjs/common';
import { DisciplinesModule } from '../disciplines/disciplines.module.js';
import { ObjectifsModule } from '../objectifs/objectifs.module.js';
import { CreneauxModule } from '../creneaux/creneaux.module.js';
import { SeancesModule } from '../seances/seances.module.js';
import { anthropicClientProvider } from '../workout-generation/infrastructure/adapters/anthropic-client.provider.js';
import { ComputeFreeSlotCapacityUseCase } from './application/use-cases/compute-free-slot-capacity.use-case.js';
import { GeneratePlanningUseCase } from './application/use-cases/generate-planning.use-case.js';
import { DISCIPLINE_REFERENTIAL } from './domain/ports/outbound/discipline-referential.port.js';
import { GOAL_PROVIDER } from './domain/ports/outbound/goal-provider.port.js';
import { PLANNING_AI_GENERATOR } from './domain/ports/outbound/planning-ai-generator.port.js';
import { PLANNING_CLOCK } from './domain/ports/outbound/planning-clock.port.js';
import { PLANNING_SCHEDULER } from './domain/ports/outbound/planning-scheduler.port.js';
import { SESSIONS_PROVIDER } from './domain/ports/outbound/sessions.provider.port.js';
import { SLOT_OCCURRENCES_PROVIDER } from './domain/ports/outbound/slot-occurrences.provider.port.js';
import { DisciplinesReferentialAdapter } from './infrastructure/adapters/discipline-referential.adapter.js';
import { ClaudePlanningGeneratorAdapter } from './infrastructure/adapters/claude-planning-generator.adapter.js';
import { ObjectifsGoalProvider } from './infrastructure/adapters/goal-provider.adapter.js';
import { SeancesPlanningScheduler } from './infrastructure/adapters/session-scheduler.adapter.js';
import { SeancesSessionsAdapter } from './infrastructure/adapters/sessions.adapter.js';
import { CreneauxOccurrencesAdapter } from './infrastructure/adapters/slot-occurrences.adapter.js';
import { parisToday } from './infrastructure/clock/paris-planning-clock.js';
import { PlanningController } from './presentation/http/controllers/planning.controller.js';

@Module({
  imports: [CreneauxModule, SeancesModule, DisciplinesModule, ObjectifsModule],
  controllers: [PlanningController],
  providers: [
    ComputeFreeSlotCapacityUseCase,
    GeneratePlanningUseCase,
    anthropicClientProvider,
    {
      provide: SLOT_OCCURRENCES_PROVIDER,
      useClass: CreneauxOccurrencesAdapter,
    },
    { provide: SESSIONS_PROVIDER, useClass: SeancesSessionsAdapter },
    {
      provide: DISCIPLINE_REFERENTIAL,
      useClass: DisciplinesReferentialAdapter,
    },
    { provide: GOAL_PROVIDER, useClass: ObjectifsGoalProvider },
    {
      provide: PLANNING_AI_GENERATOR,
      useClass: ClaudePlanningGeneratorAdapter,
    },
    { provide: PLANNING_SCHEDULER, useClass: SeancesPlanningScheduler },
    { provide: PLANNING_CLOCK, useValue: parisToday },
  ],
  exports: [ComputeFreeSlotCapacityUseCase, GeneratePlanningUseCase],
})
export class PlanificationModule {}
