import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidDisciplineError extends DomainError {
  readonly code = 'DISCIPLINE_INVALID';

  constructor(reason: string) {
    super(`Discipline invalide : ${reason}.`);
  }
}
