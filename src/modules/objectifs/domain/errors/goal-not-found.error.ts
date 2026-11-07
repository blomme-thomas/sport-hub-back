import { DomainError } from '../../../../shared/domain/domain-error.js';

export class GoalNotFoundError extends DomainError {
  readonly code = 'GOAL_NOT_FOUND';

  constructor() {
    super("L'objectif demandé est introuvable.");
  }
}
