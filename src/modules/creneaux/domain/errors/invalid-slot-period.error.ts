import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidSlotPeriodError extends DomainError {
  readonly code = 'SLOT_PERIOD_INVALID';

  constructor() {
    super(
      'La date de fin de la période doit être postérieure ou égale à la date de début.',
    );
  }
}
