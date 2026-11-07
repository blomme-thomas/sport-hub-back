import { Inject, Injectable } from '@nestjs/common';
import type { GeneratedWorkout } from '../../domain/entities/generated-workout.entity.js';
import {
  RECENT_TRAINING_CONTEXT_PROVIDER,
  type IRecentTrainingContextProvider,
  type RecentTrainingWeek,
} from '../../domain/ports/outbound/recent-training-context.port.js';
import {
  WORKOUT_AI_GENERATOR,
  type IWorkoutAiGenerator,
} from '../../domain/ports/outbound/workout-ai-generator.port.js';
import type {
  GenerateWorkoutCommand,
  GeneratedWorkoutDto,
} from '../dtos/generate-workout.dto.js';

const DEFAULT_WEEKS = 4;

@Injectable()
export class GenerateWorkoutUseCase {
  constructor(
    @Inject(RECENT_TRAINING_CONTEXT_PROVIDER)
    private readonly contextProvider: IRecentTrainingContextProvider,
    @Inject(WORKOUT_AI_GENERATOR)
    private readonly generator: IWorkoutAiGenerator,
  ) {}

  /**
   * Génère une séance à partir des statistiques des dernières semaines complètes (quatre par défaut).
   * Aucune séance n'est persistée ; une sortie invalide ou un échec du service d'IA est propagé sans séance partielle.
   *
   * @throws WorkoutGenerationUnavailableError si le service d'IA est indisponible ou non configuré.
   * @throws WorkoutGenerationAccessDeniedError si le service d'IA refuse l'accès.
   * @throws InvalidGeneratedWorkoutError si la sortie du modèle est inexploitable.
   */
  async execute(command: GenerateWorkoutCommand): Promise<GeneratedWorkoutDto> {
    const context = await this.contextProvider.getRecent(
      command.weeks ?? DEFAULT_WEEKS,
    );
    const workout = await this.generator.generate({
      sport: command.sport,
      goal: command.goal,
      durationMinutes: command.durationMinutes,
      context,
    });
    return GenerateWorkoutUseCase.toDto(workout, context.weeks);
  }

  private static toDto(
    workout: GeneratedWorkout,
    weeks: RecentTrainingWeek[],
  ): GeneratedWorkoutDto {
    return {
      title: workout.title,
      sport: workout.sport,
      summary: workout.summary,
      totalDurationMinutes: workout.totalDurationMinutes,
      steps: workout.steps.map((step) => ({
        order: step.order,
        label: step.label,
        durationMinutes: step.durationMinutes,
        intensity: step.intensity.toString(),
        notes: step.notes,
      })),
      basedOn: {
        weeks: weeks.length,
        from: weeks[0]?.start ?? null,
        to: weeks[weeks.length - 1]?.end ?? null,
      },
    };
  }
}
