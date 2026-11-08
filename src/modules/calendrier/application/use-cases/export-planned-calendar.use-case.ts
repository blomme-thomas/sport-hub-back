import { Inject, Injectable } from '@nestjs/common';
import {
  CALENDAR_CLOCK,
  CALENDAR_SESSIONS_READER,
  type CalendarClock,
  type ICalendarSessionsReader,
} from '../../domain/ports/outbound/calendar.ports.js';
import { serializeIcsCalendar } from '../../domain/services/ics-calendar.serializer.js';

export interface ExportPlannedCalendarQuery {
  from: string;
  to: string;
}

@Injectable()
export class ExportPlannedCalendarUseCase {
  constructor(
    @Inject(CALENDAR_SESSIONS_READER)
    private readonly sessions: ICalendarSessionsReader,
    @Inject(CALENDAR_CLOCK)
    private readonly clock: CalendarClock,
  ) {}

  /**
   * Exporte en ICS les séances planifiées de la période, une entrée par séance ; les séances réalisées ou manquées n'y figurent pas.
   * Une séance est exportée comme événement journée entière : le planning ne fixe pas d'heure de début.
   *
   * @throws InvalidSessionError si la période est inversée ou dépasse 366 jours (règle de la lecture des séances).
   */
  async execute(query: ExportPlannedCalendarQuery): Promise<string> {
    const sessions = await this.sessions.sessionsIn(query.from, query.to);
    const events = sessions
      .filter((session) => session.status === 'planifiee')
      .map((session) => ({
        uid: `${session.id}@sport-hub`,
        date: session.date,
        summary: `${session.disciplineTypeKey} - ${session.durationMinutes} min`,
      }));
    return serializeIcsCalendar(events, this.clock());
  }
}
