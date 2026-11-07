import { DomainError } from '../../../../shared/domain/domain-error.js';

export class SlotPeriodTooLargeError extends DomainError {
  readonly code = 'SLOT_PERIOD_TOO_LARGE';

  constructor(maxDays: number) {
    super(`La période demandée dépasse ${maxDays} jours.`);
  }
}
