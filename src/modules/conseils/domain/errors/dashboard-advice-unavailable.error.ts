import { DomainError } from '../../../../shared/domain/domain-error.js';

export class DashboardAdviceUnavailableError extends DomainError {
  readonly code = 'DASHBOARD_ADVICE_UNAVAILABLE';

  constructor() {
    super(
      'La génération du conseil du tableau de bord est momentanément indisponible. Réessayez plus tard.',
    );
  }
}
