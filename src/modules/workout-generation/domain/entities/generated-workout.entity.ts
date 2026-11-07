import { InvalidGeneratedWorkoutError } from '../errors/invalid-generated-workout.error.js';
import type { WorkoutStep } from '../value-objects/workout-step.vo.js';

const MIN_TOTAL_DURATION_MINUTES = 5;
const MAX_TOTAL_DURATION_MINUTES = 300;

export interface GeneratedWorkoutProps {
  title: string;
  sport: string;
  summary: string;
  totalDurationMinutes: number;
  steps: WorkoutStep[];
}

export class GeneratedWorkout {
  private constructor(private readonly props: GeneratedWorkoutProps) {}

  /**
   * Valide une séance produite par l'IA avant qu'elle ne soit utilisée : titre non vide, au moins une étape,
   * durée totale entre 5 et 300 minutes égale à la somme des étapes, étapes numérotées de 1 à n sans trou.
   *
   * @throws InvalidGeneratedWorkoutError si un invariant n'est pas respecté : aucune séance partielle n'est construite.
   */
  static create(props: GeneratedWorkoutProps): GeneratedWorkout {
    if (props.title.trim().length === 0) {
      throw new InvalidGeneratedWorkoutError('Le titre de la séance est vide.');
    }
    if (props.steps.length === 0) {
      throw new InvalidGeneratedWorkoutError(
        'La séance ne contient aucune étape.',
      );
    }
    if (
      props.totalDurationMinutes < MIN_TOTAL_DURATION_MINUTES ||
      props.totalDurationMinutes > MAX_TOTAL_DURATION_MINUTES
    ) {
      throw new InvalidGeneratedWorkoutError(
        'La durée totale de la séance est hors des bornes autorisées.',
      );
    }
    props.steps.forEach((step, index) => {
      if (step.order !== index + 1) {
        throw new InvalidGeneratedWorkoutError(
          "L'ordre des étapes de la séance n'est pas continu à partir de 1.",
        );
      }
    });
    const summedDuration = props.steps.reduce(
      (total, step) => total + step.durationMinutes,
      0,
    );
    if (summedDuration !== props.totalDurationMinutes) {
      throw new InvalidGeneratedWorkoutError(
        'La durée totale de la séance ne correspond pas à la somme de ses étapes.',
      );
    }
    return new GeneratedWorkout({ ...props, steps: [...props.steps] });
  }

  get title(): string {
    return this.props.title;
  }

  get sport(): string {
    return this.props.sport;
  }

  get summary(): string {
    return this.props.summary;
  }

  get totalDurationMinutes(): number {
    return this.props.totalDurationMinutes;
  }

  get steps(): readonly WorkoutStep[] {
    return [...this.props.steps];
  }
}
