import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidStatsRangeError extends DomainError {
  readonly code = 'STATS_RANGE_INVALID';

  constructor() {
    super('La date de fin doit être postérieure ou égale à la date de début.');
  }
}
