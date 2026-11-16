import type { Session } from '../../entities/session.entity.js';

export interface SessionImportRecord {
  importId: string;
  importedAt: Date;
  sessionCount: number;
}

export interface ISessionImportRepository {
  /** Indique si un fichier d'import portant cet identifiant a déjà été enregistré. */
  exists(importId: string): Promise<boolean>;

  /**
   * Enregistre le fichier d'import et toutes ses séances dans une même transaction.
   *
   * @throws SessionImportAlreadyDoneError si un fichier de même identifiant a été enregistré entre-temps.
   */
  saveAll(record: SessionImportRecord, sessions: Session[]): Promise<void>;
}

export const SESSION_IMPORT_REPOSITORY = Symbol('SESSION_IMPORT_REPOSITORY');
