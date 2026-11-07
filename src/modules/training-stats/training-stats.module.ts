import { Module } from '@nestjs/common';
import { GetTrainingStatsUseCase } from './application/use-cases/get-training-stats.use-case.js';
import { TrainingStatsCalculator } from './domain/services/training-stats-calculator.service.js';
import { TRAINING_ACTIVITY_READ_MODEL } from './domain/ports/outbound/training-activity.read-model.port.js';
import { PrismaTrainingActivityReadModel } from './infrastructure/persistence/prisma/training-activity.read-model.js';
import { TrainingStatsController } from './presentation/http/controllers/training-stats.controller.js';

@Module({
  controllers: [TrainingStatsController],
  providers: [
    GetTrainingStatsUseCase,
    {
      provide: TrainingStatsCalculator,
      useValue: new TrainingStatsCalculator(),
    },
    {
      provide: TRAINING_ACTIVITY_READ_MODEL,
      useClass: PrismaTrainingActivityReadModel,
    },
  ],
  exports: [GetTrainingStatsUseCase],
})
export class TrainingStatsModule {}
