import { DomainError } from '../../../../shared/domain/domain-error.js';

export class PlanningPeriodInvalidError extends DomainError {
  readonly code = 'PLANNING_PERIOD_INVALID';

  constructor(reason: string) {
    super(`Période de planification invalide : ${reason}.`);
  }
}
