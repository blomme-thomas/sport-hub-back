import { DomainError } from '../../../../shared/domain/domain-error.js';

export class DisciplineNotFoundError extends DomainError {
  readonly code = 'DISCIPLINE_NOT_FOUND';

  constructor() {
    super('La discipline demandée est introuvable.');
  }
}
