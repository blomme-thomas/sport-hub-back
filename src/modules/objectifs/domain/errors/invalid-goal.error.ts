import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidGoalError extends DomainError {
  readonly code = 'GOAL_INVALID';

  constructor(reason: string) {
    super(`Objectif invalide : ${reason}.`);
  }
}
