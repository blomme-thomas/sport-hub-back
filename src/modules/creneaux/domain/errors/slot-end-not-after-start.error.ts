import { DomainError } from '../../../../shared/domain/domain-error.js';

export class SlotEndNotAfterStartError extends DomainError {
  readonly code = 'SLOT_END_NOT_AFTER_START';

  constructor() {
    super(
      "L'heure de fin du créneau doit être strictement postérieure à l'heure de début.",
    );
  }
}
