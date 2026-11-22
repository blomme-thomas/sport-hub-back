import { DomainError } from '../../../../shared/domain/domain-error.js';

export class WorkoutGenerationUnavailableError extends DomainError {
  readonly code = 'WORKOUT_GENERATION_UNAVAILABLE';

  constructor() {
    super(
      'La génération de séance est momentanément indisponible. Réessayez plus tard.',
    );
  }
}
