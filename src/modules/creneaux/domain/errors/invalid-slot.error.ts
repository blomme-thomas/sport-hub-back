import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidSlotError extends DomainError {
  readonly code = 'SLOT_INVALID';

  constructor(reason: string) {
    super(`Créneau invalide : ${reason}.`);
  }
}
