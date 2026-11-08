import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidSessionModuleError extends DomainError {
  readonly code = 'SESSION_MODULE_INVALID';

  constructor(reason: string) {
    super(`Module de séance invalide : ${reason}.`);
  }
}
