import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidWeekError extends DomainError {
  readonly code = 'SETTINGS_WEEK_INVALID';

  constructor() {
    super('La semaine doit être une semaine ISO valide (AAAA-Www).');
  }
}
