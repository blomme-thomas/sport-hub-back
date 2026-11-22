import { DomainError } from '../../../../shared/domain/domain-error.js';

export class WeeklyReviewAccessDeniedError extends DomainError {
  readonly code = 'WEEKLY_REVIEW_ACCESS_DENIED';

  constructor() {
    super("L'accès au service de génération du bilan est refusé.");
  }
}
