import { DomainError } from '../../../../shared/domain/domain-error.js';

export interface SessionImportIssue {
  field: string;
  code: string;
  message: string;
}

export class SessionImportInvalidError extends DomainError {
  readonly code = 'SESSION_IMPORT_INVALID';

  constructor(readonly errors: SessionImportIssue[]) {
    super(
      `Fichier d'import invalide : ${errors.length} erreur(s), aucune séance importée.`,
    );
  }
}
