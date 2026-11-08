import { DomainError } from '../../../../shared/domain/domain-error.js';

export class UnknownSessionDisciplineError extends DomainError {
  readonly code = 'SESSION_DISCIPLINE_UNKNOWN';

  constructor() {
    super('La discipline demandée est absente du référentiel.');
  }
}
