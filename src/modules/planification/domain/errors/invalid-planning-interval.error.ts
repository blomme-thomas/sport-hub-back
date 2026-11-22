import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidPlanningIntervalError extends DomainError {
  readonly code = 'PLANNING_INTERVAL_INVALID';

  constructor(reason: string) {
    super(`Intervalle de planification invalide : ${reason}.`);
  }
}
