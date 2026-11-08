export interface CalendarSession {
  id: string;
  date: string;
  disciplineTypeKey: string;
  durationMinutes: number;
  status: string;
}

/** Contrat vers les séances : fournit les séances d'une période, au format AAAA-MM-JJ, bornes incluses. */
export interface ICalendarSessionsReader {
  sessionsIn(from: string, to: string): Promise<CalendarSession[]>;
}

export type CalendarClock = () => Date;

export const CALENDAR_SESSIONS_READER = Symbol('CALENDAR_SESSIONS_READER');
export const CALENDAR_CLOCK = Symbol('CALENDAR_CLOCK');
