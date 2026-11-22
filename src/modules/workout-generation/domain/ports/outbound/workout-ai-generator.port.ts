import type { GeneratedWorkout } from '../../entities/generated-workout.entity.js';
import type { RecentTrainingContext } from './recent-training-context.port.js';

export interface GenerateWorkoutInput {
  sport: string | null;
  goal: string | null;
  durationMinutes: number | null;
  context: RecentTrainingContext;
}

export interface IWorkoutAiGenerator {
  /**
   * Génère une séance à partir de la demande et du contexte récent, validée par le Domain.
   *
   * @throws WorkoutGenerationUnavailableError si le service d'IA est indisponible ou non configuré.
   * @throws WorkoutGenerationAccessDeniedError si le service d'IA refuse l'accès.
   * @throws InvalidGeneratedWorkoutError si la sortie du modèle est inexploitable.
   */
  generate(input: GenerateWorkoutInput): Promise<GeneratedWorkout>;
}

export const WORKOUT_AI_GENERATOR = Symbol('WORKOUT_AI_GENERATOR');
