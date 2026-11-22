import { DomainError } from '../../../../shared/domain/domain-error.js';

export class ActivityCommentInvalidOutputError extends DomainError {
  readonly code = 'ACTIVITY_COMMENT_INVALID_OUTPUT';

  constructor(reason: string) {
    super(`Commentaire généré inexploitable : ${reason}.`);
  }
}
