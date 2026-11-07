import { DomainError } from '../../../../shared/domain/domain-error.js';

export class StatsRangeTooLargeError extends DomainError {
  readonly code = 'STATS_RANGE_TOO_LARGE';

  constructor(maxPeriods: number) {
    super(
      `La plage demandée dépasse ${maxPeriods} périodes. Réduisez la plage de dates.`,
    );
  }
}
