import { DomainError } from '../../../../shared/domain/domain-error.js';

export class DashboardAdviceInvalidOutputError extends DomainError {
  readonly code = 'DASHBOARD_ADVICE_INVALID_OUTPUT';

  constructor(reason: string) {
    super(`La réponse du modèle n'est pas exploitable : ${reason}.`);
  }
}
