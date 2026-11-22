import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidWeeklyTargetError extends DomainError {
  readonly code = 'SETTINGS_WEEKLY_TARGET_INVALID';

  constructor() {
    super(
      'La cible hebdomadaire doit être un nombre entier de secondes strictement positif, ou vide pour la retirer.',
    );
  }
}
