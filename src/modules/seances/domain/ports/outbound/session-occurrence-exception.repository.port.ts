import type { SessionOccurrenceException } from '../../entities/session-occurrence-exception.js';

export interface ISessionOccurrenceExceptionRepository {
  /** Renvoie l'exception de l'occurrence de cette séance à cette date de programmation, ou null. */
  findBySessionAndDate(
    sessionId: string,
    occurrenceDate: Date,
  ): Promise<SessionOccurrenceException | null>;

  /** Renvoie toutes les exceptions de ces séances. */
  findBySessionIds(sessionIds: string[]): Promise<SessionOccurrenceException[]>;

  /** Enregistre ou remplace l'exception de l'occurrence. */
  save(exception: SessionOccurrenceException): Promise<void>;

  /** Supprime l'exception de l'occurrence ; sans effet si elle n'existe pas. */
  delete(sessionId: string, occurrenceDate: Date): Promise<void>;
}

export const SESSION_OCCURRENCE_EXCEPTION_REPOSITORY = Symbol(
  'SESSION_OCCURRENCE_EXCEPTION_REPOSITORY',
);
