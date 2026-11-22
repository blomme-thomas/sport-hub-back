import { DomainError } from '../../../../shared/domain/domain-error.js';

export class ActivityCommentNotFoundError extends DomainError {
  readonly code = 'ACTIVITY_COMMENT_NOT_FOUND';

  constructor() {
    super("Aucun commentaire n'a encore été généré pour cette activité.");
  }
}
