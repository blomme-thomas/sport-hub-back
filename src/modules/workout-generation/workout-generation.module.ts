import { Module } from '@nestjs/common';
import { TrainingStatsModule } from '../training-stats/training-stats.module.js';
import { GenerateWorkoutUseCase } from './application/use-cases/generate-workout.use-case.js';
import { RECENT_TRAINING_CONTEXT_PROVIDER } from './domain/ports/outbound/recent-training-context.port.js';
import { WORKOUT_AI_GENERATOR } from './domain/ports/outbound/workout-ai-generator.port.js';
import { anthropicClientProvider } from './infrastructure/adapters/anthropic-client.provider.js';
import { ClaudeWorkoutGeneratorAdapter } from './infrastructure/adapters/claude-workout-generator.adapter.js';
import {
  TrainingStatsContextAdapter,
  WORKOUT_CONTEXT_CLOCK,
} from './infrastructure/adapters/training-stats-context.adapter.js';
import { WorkoutsController } from './presentation/http/controllers/workouts.controller.js';

@Module({
  imports: [TrainingStatsModule],
  controllers: [WorkoutsController],
  providers: [
    GenerateWorkoutUseCase,
    anthropicClientProvider,
    { provide: WORKOUT_CONTEXT_CLOCK, useValue: () => new Date() },
    {
      provide: RECENT_TRAINING_CONTEXT_PROVIDER,
      useClass: TrainingStatsContextAdapter,
    },
    { provide: WORKOUT_AI_GENERATOR, useClass: ClaudeWorkoutGeneratorAdapter },
  ],
})
export class WorkoutGenerationModule {}
