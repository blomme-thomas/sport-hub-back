import type { Session } from '../entities/session.entity.js';
import type { SessionOccurrenceException } from '../entities/session-occurrence-exception.js';
import type { SessionRecurrence } from '../value-objects/session-recurrence.vo.js';
import type { SessionStatus } from '../value-objects/session-status.vo.js';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const WEEK_IN_MILLISECONDS = 7 * DAY_IN_MILLISECONDS;

export type OccurrenceStatus = SessionStatus | 'annulee';

export interface SessionOccurrence {
  sessionId: string;
  date: string;
  startTime: string | null;
  durationMinutes: number;
  disciplineTypeKey: string;
  recurrence: SessionRecurrence;
  status: OccurrenceStatus;
}

/**
 * Renvoie les occurrences d'une séance dont la date tombe entre `from` et `to` (bornes incluses), sans exception.
 * Une séance non récurrente n'a qu'une occurrence, à sa date. Une séance hebdomadaire se répète chaque semaine à partir de sa date, sans fin.
 * Chaque occurrence reprend l'heure, la durée, la discipline et le statut de la série.
 */
export function expandOccurrences(
  session: Session,
  from: Date,
  to: Date,
): SessionOccurrence[] {
  return occurrenceTimes(session, from, to).map((time) =>
    resolveOccurrence(session, new Date(time), null),
  );
}

/** Vrai si la date est une date de programmation de la série (même jour de la semaine, à partir de la date de départ). */
export function isSeriesOccurrence(session: Session, date: Date): boolean {
  const offset = date.getTime() - session.date.getTime();
  if (session.recurrence === 'aucune') {
    return offset === 0;
  }
  return offset >= 0 && offset % WEEK_IN_MILLISECONDS === 0;
}

/**
 * Renvoie l'occurrence correspondant à une date de programmation, en tenant compte de son exception éventuelle.
 * Un déplacement change la date et, si fournie, l'heure ; une annulation donne le statut `annulee`.
 */
export function resolveOccurrence(
  session: Session,
  occurrenceDate: Date,
  exception: SessionOccurrenceException | null,
): SessionOccurrence {
  const date = exception?.movedDate ?? occurrenceDate;
  return {
    sessionId: session.id.toString(),
    date: formatDate(date),
    startTime: exception?.movedStartTime ?? session.startTime,
    durationMinutes: session.durationMinutes,
    disciplineTypeKey: session.disciplineTypeKey,
    recurrence: session.recurrence,
    status: exception?.cancelled ? 'annulee' : session.status,
  };
}

/**
 * Renvoie les occurrences d'une séance visibles entre `from` et `to`, exceptions appliquées.
 * Une occurrence déplacée apparaît à sa nouvelle date, même si la date de programmation est hors période.
 */
export function occurrencesInPeriod(
  session: Session,
  exceptions: readonly SessionOccurrenceException[],
  from: Date,
  to: Date,
): SessionOccurrence[] {
  const excepted = new Set(exceptions.map((e) => formatDate(e.occurrenceDate)));
  const series = occurrenceTimes(session, from, to)
    .filter((time) => !excepted.has(formatDate(new Date(time))))
    .map((time) => resolveOccurrence(session, new Date(time), null));
  const moved = exceptions
    .filter((e) => {
      const date = e.movedDate ?? e.occurrenceDate;
      return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
    })
    .map((e) => resolveOccurrence(session, e.occurrenceDate, e));
  return [...series, ...moved];
}

function occurrenceTimes(session: Session, from: Date, to: Date): number[] {
  const first = session.date.getTime();
  const lower = from.getTime();
  const upper = to.getTime();
  if (session.recurrence === 'aucune') {
    return first >= lower && first <= upper ? [first] : [];
  }
  const start =
    first >= lower
      ? first
      : first +
        Math.ceil((lower - first) / WEEK_IN_MILLISECONDS) *
          WEEK_IN_MILLISECONDS;
  const times: number[] = [];
  for (let time = start; time <= upper; time += WEEK_IN_MILLISECONDS) {
    times.push(time);
  }
  return times;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
