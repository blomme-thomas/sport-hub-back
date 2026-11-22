import { DomainError } from '../../../../shared/domain/domain-error.js';

export class WeeklyReviewInvalidOutputError extends DomainError {
  readonly code = 'WEEKLY_REVIEW_INVALID_OUTPUT';

  constructor(reason: string) {
    super(`Bilan généré inexploitable : ${reason}.`);
  }
}
