import { DomainError } from '../../../../shared/domain/domain-error.js';

export class WeeklyReviewNotFoundError extends DomainError {
  readonly code = 'WEEKLY_REVIEW_NOT_FOUND';

  constructor() {
    super("Aucun bilan n'a encore été généré pour cette semaine.");
  }
}
