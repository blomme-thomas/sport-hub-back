import { DomainError } from '../../../../shared/domain/domain-error.js';

export class PlanningInvalidOutputError extends DomainError {
  readonly code = 'PLANNING_INVALID_OUTPUT';

  constructor(reason: string) {
    super(`Planning généré inexploitable : ${reason}.`);
  }
}
