import { DomainError } from '../../../../shared/domain/domain-error.js';

export class DashboardAdviceNotFoundError extends DomainError {
  readonly code = 'DASHBOARD_ADVICE_NOT_FOUND';

  constructor() {
    super("Aucun conseil n'a encore été généré pour cette semaine.");
  }
}
