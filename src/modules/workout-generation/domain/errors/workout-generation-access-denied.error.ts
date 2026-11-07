import { DomainError } from '../../../../shared/domain/domain-error.js';

export class WorkoutGenerationAccessDeniedError extends DomainError {
  readonly code = 'WORKOUT_GENERATION_ACCESS_DENIED';

  constructor() {
    super("La génération de séance n'est pas autorisée par le service d'IA.");
  }
}
