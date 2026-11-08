import { DomainError } from '../../../../shared/domain/domain-error.js';

export class ActivityCommentUnavailableError extends DomainError {
  readonly code = 'ACTIVITY_COMMENT_UNAVAILABLE';

  constructor() {
    super(
      'La génération de commentaire est momentanément indisponible. Réessayez plus tard.',
    );
  }
}
