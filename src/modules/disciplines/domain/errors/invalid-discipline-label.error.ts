import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidDisciplineLabelError extends DomainError {
  readonly code = 'DISCIPLINE_LABEL_INVALID';

  constructor(reason: string) {
    super(`Libellé de discipline invalide : ${reason}.`);
  }
}
