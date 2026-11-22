import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidTargetTimeError extends DomainError {
  readonly code = 'GOAL_TARGET_TIME_INVALID';

  constructor() {
    super(
      'Le temps cible doit être un nombre entier de secondes strictement positif.',
    );
  }
}
