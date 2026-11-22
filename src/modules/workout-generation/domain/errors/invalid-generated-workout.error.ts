import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidGeneratedWorkoutError extends DomainError {
  readonly code = 'WORKOUT_GENERATION_INVALID_OUTPUT';

  constructor(message: string) {
    super(message);
  }
}
