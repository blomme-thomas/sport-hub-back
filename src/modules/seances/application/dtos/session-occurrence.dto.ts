export interface MoveSessionOccurrenceCommand {
  sessionId: string;
  occurrenceDate: string;
  date: string;
  startTime?: string | null;
}

export interface SessionOccurrenceCommand {
  sessionId: string;
  occurrenceDate: string;
}
