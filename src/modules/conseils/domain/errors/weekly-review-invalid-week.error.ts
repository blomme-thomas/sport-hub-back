import { DomainError } from '../../../../shared/domain/domain-error.js';

export class WeeklyReviewInvalidWeekError extends DomainError {
  readonly code = 'WEEKLY_REVIEW_INVALID_WEEK';

  constructor() {
    super('La semaine demandée est invalide. Format attendu : AAAA-Www.');
  }
}
