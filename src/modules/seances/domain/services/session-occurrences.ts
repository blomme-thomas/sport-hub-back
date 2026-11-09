import type { Session } from '../entities/session.entity.js';
import type { SessionRecurrence } from '../value-objects/session-recurrence.vo.js';
import type { SessionStatus } from '../value-objects/session-status.vo.js';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const WEEK_IN_MILLISECONDS = 7 * DAY_IN_MILLISECONDS;

export interface SessionOccurrence {
  sessionId: string;
  date: string;
  startTime: string | null;
  durationMinutes: number;
  disciplineTypeKey: string;
  recurrence: SessionRecurrence;
  status: SessionStatus;
}

/**
 * Renvoie les occurrences d'une séance dont la date tombe entre `from` et `to` (bornes incluses).
 * Une séance non récurrente n'a qu'une occurrence, à sa date. Une séance hebdomadaire se répète chaque semaine à partir de sa date, sans fin.
 * Chaque occurrence reprend l'heure, la durée, la discipline et le statut de la série.
 */
export function expandOccurrences(
  session: Session,
  from: Date,
  to: Date,
): SessionOccurrence[] {
  const dates = occurrenceDates(session, from, to);
  return dates.map((time) => ({
    sessionId: session.id.toString(),
    date: new Date(time).toISOString().slice(0, 10),
    startTime: session.startTime,
    durationMinutes: session.durationMinutes,
    disciplineTypeKey: session.disciplineTypeKey,
    recurrence: session.recurrence,
    status: session.status,
  }));
}

function occurrenceDates(session: Session, from: Date, to: Date): number[] {
  const first = session.date.getTime();
  const lower = from.getTime();
  const upper = to.getTime();
  if (session.recurrence === 'aucune') {
    return first >= lower && first <= upper ? [first] : [];
  }
  const dates: number[] = [];
  const firstInRange =
    first >= lower
      ? first
      : first +
        Math.ceil((lower - first) / WEEK_IN_MILLISECONDS) *
          WEEK_IN_MILLISECONDS;
  for (let time = firstInRange; time <= upper; time += WEEK_IN_MILLISECONDS) {
    dates.push(time);
  }
  return dates;
}
