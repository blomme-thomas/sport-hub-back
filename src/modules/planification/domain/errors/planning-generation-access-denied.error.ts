import { DomainError } from '../../../../shared/domain/domain-error.js';

export class PlanningGenerationAccessDeniedError extends DomainError {
  readonly code = 'PLANNING_GENERATION_ACCESS_DENIED';

  constructor() {
    super("L'accès au service de génération de planning est refusé.");
  }
}
