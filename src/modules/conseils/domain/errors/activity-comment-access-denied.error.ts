import { DomainError } from '../../../../shared/domain/domain-error.js';

export class ActivityCommentAccessDeniedError extends DomainError {
  readonly code = 'ACTIVITY_COMMENT_ACCESS_DENIED';

  constructor() {
    super("L'accès au service de génération de commentaire est refusé.");
  }
}
