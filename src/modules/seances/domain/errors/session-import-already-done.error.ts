import { DomainError } from '../../../../shared/domain/domain-error.js';

export class SessionImportAlreadyDoneError extends DomainError {
  readonly code = 'SESSION_IMPORT_ALREADY_DONE';

  constructor() {
    super('Ce fichier d’import a déjà été importé.');
  }
}
