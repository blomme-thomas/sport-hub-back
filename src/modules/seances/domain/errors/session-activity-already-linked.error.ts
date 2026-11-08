import { DomainError } from '../../../../shared/domain/domain-error.js';

export class SessionActivityAlreadyLinkedError extends DomainError {
  readonly code = 'SESSION_ACTIVITY_ALREADY_LINKED';

  constructor() {
    super('Cette activité est déjà liée à une autre séance.');
  }
}
