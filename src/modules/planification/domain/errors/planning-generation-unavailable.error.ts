import { DomainError } from '../../../../shared/domain/domain-error.js';

export class PlanningGenerationUnavailableError extends DomainError {
  readonly code = 'PLANNING_GENERATION_UNAVAILABLE';

  constructor() {
    super(
      'La génération de planning est momentanément indisponible. Réessayez plus tard.',
    );
  }
}
