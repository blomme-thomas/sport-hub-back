import { DomainError } from '../../../../shared/domain/domain-error.js';

export class ExportMonthInvalidError extends DomainError {
  readonly code = 'EXPORT_MONTH_INVALID';

  constructor() {
    super('Le mois demandé est invalide. Format attendu : AAAA-MM.');
  }
}
