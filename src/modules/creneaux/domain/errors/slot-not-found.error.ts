import { DomainError } from '../../../../shared/domain/domain-error.js';

export class SlotNotFoundError extends DomainError {
  readonly code = 'SLOT_NOT_FOUND';

  constructor() {
    super('Le créneau demandé est introuvable.');
  }
}
