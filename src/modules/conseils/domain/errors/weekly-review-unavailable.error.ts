import { DomainError } from '../../../../shared/domain/domain-error.js';

export class WeeklyReviewUnavailableError extends DomainError {
  readonly code = 'WEEKLY_REVIEW_UNAVAILABLE';

  constructor() {
    super(
      'La génération du bilan hebdomadaire est momentanément indisponible. Réessayez plus tard.',
    );
  }
}
