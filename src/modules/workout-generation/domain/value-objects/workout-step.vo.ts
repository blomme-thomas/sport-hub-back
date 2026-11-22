import { InvalidGeneratedWorkoutError } from '../errors/invalid-generated-workout.error.js';
import type { WorkoutIntensity } from './workout-intensity.vo.js';

export interface WorkoutStepProps {
  order: number;
  label: string;
  durationMinutes: number;
  intensity: WorkoutIntensity;
  notes: string | null;
}

export class WorkoutStep {
  private constructor(private readonly props: WorkoutStepProps) {}

  /**
   * Construit une étape : position à partir de 1, libellé non vide, durée entière d'au moins une minute.
   *
   * @throws InvalidGeneratedWorkoutError si un de ces invariants n'est pas respecté.
   */
  static create(props: WorkoutStepProps): WorkoutStep {
    if (!Number.isInteger(props.order) || props.order < 1) {
      throw new InvalidGeneratedWorkoutError(
        "L'ordre d'une étape doit être un entier à partir de 1.",
      );
    }
    if (props.label.trim().length === 0) {
      throw new InvalidGeneratedWorkoutError(
        "Le libellé d'une étape ne peut pas être vide.",
      );
    }
    if (!Number.isInteger(props.durationMinutes) || props.durationMinutes < 1) {
      throw new InvalidGeneratedWorkoutError(
        "La durée d'une étape doit être un nombre entier de minutes, d'au moins une minute.",
      );
    }
    return new WorkoutStep({ ...props });
  }

  get order(): number {
    return this.props.order;
  }

  get label(): string {
    return this.props.label;
  }

  get durationMinutes(): number {
    return this.props.durationMinutes;
  }

  get intensity(): WorkoutIntensity {
    return this.props.intensity;
  }

  get notes(): string | null {
    return this.props.notes;
  }
}
