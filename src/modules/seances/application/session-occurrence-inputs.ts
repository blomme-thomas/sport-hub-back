import type { Session } from '../domain/entities/session.entity.js';
import { SessionOccurrenceNotFoundError } from '../domain/errors/session-occurrence-not-found.error.js';
import { isSeriesOccurrence } from '../domain/services/session-occurrences.js';
import type { ISessionRepository } from '../domain/ports/outbound/session.repository.port.js';
import { loadSession, toCalendarDate } from './session-inputs.js';

/**
 * Charge la séance et vérifie que la date est une occurrence de sa série.
 *
 * @throws SessionNotFoundError si la séance n'existe pas.
 * @throws SessionOccurrenceNotFoundError si la date n'est pas une occurrence de la série.
 */
export async function loadSeriesOccurrence(
  sessions: ISessionRepository,
  sessionId: string,
  occurrenceDate: string,
): Promise<{ session: Session; date: Date }> {
  const session = await loadSession(sessions, sessionId);
  const date = toCalendarDate(occurrenceDate);
  if (!isSeriesOccurrence(session, date)) {
    throw new SessionOccurrenceNotFoundError();
  }
  return { session, date };
}
