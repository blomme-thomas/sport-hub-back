import { Module } from '@nestjs/common';
import { CreateGoalUseCase } from './application/use-cases/create-goal.use-case.js';
import { DeleteGoalUseCase } from './application/use-cases/delete-goal.use-case.js';
import { GetGoalUseCase } from './application/use-cases/get-goal.use-case.js';
import { ListGoalsUseCase } from './application/use-cases/list-goals.use-case.js';
import { UpdateGoalUseCase } from './application/use-cases/update-goal.use-case.js';
import { GOAL_REPOSITORY } from './domain/ports/outbound/goal.repository.port.js';
import { PrismaGoalRepositoryAdapter } from './infrastructure/persistence/prisma/goal.repository.adapter.js';
import { GoalsController } from './presentation/http/controllers/goals.controller.js';

@Module({
  controllers: [GoalsController],
  providers: [
    CreateGoalUseCase,
    ListGoalsUseCase,
    GetGoalUseCase,
    UpdateGoalUseCase,
    DeleteGoalUseCase,
    { provide: GOAL_REPOSITORY, useClass: PrismaGoalRepositoryAdapter },
  ],
})
export class ObjectifsModule {}
