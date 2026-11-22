import { DomainError } from '../../../../shared/domain/domain-error.js';

export class DashboardAdviceAccessDeniedError extends DomainError {
  readonly code = 'DASHBOARD_ADVICE_ACCESS_DENIED';

  constructor() {
    super("Le service de génération refuse l'accès : vérifiez la clé d'API.");
  }
}
