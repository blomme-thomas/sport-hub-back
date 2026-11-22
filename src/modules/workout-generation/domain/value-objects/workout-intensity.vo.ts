import { InvalidGeneratedWorkoutError } from '../errors/invalid-generated-workout.error.js';

export const WORKOUT_INTENSITY_LEVELS = ['easy', 'moderate', 'hard'] as const;

export type WorkoutIntensityLevel = (typeof WORKOUT_INTENSITY_LEVELS)[number];

export class WorkoutIntensity {
  private constructor(private readonly level: WorkoutIntensityLevel) {}

  /**
   * Construit une intensité parmi `easy`, `moderate` et `hard`.
   *
   * @throws InvalidGeneratedWorkoutError si la valeur est inconnue.
   */
  static create(value: string): WorkoutIntensity {
    if (!(WORKOUT_INTENSITY_LEVELS as readonly string[]).includes(value)) {
      throw new InvalidGeneratedWorkoutError(
        "L'intensité d'une étape n'est pas reconnue.",
      );
    }
    return new WorkoutIntensity(value as WorkoutIntensityLevel);
  }

  equals(other: WorkoutIntensity): boolean {
    return this.level === other.level;
  }

  toString(): WorkoutIntensityLevel {
    return this.level;
  }
}
