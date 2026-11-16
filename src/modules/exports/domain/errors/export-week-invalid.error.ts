import { DomainError } from '../../../../shared/domain/domain-error.js';

export class ExportWeekInvalidError extends DomainError {
  readonly code = 'EXPORT_WEEK_INVALID';

  constructor() {
    super('La semaine demandée est invalide. Format attendu : AAAA-Www.');
  }
}
