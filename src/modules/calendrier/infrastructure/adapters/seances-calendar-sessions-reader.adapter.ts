import { Injectable } from '@nestjs/common';
import { ListSessionsUseCase } from '../../../seances/index.js';
import type {
  CalendarSession,
  ICalendarSessionsReader,
} from '../../domain/ports/outbound/calendar.ports.js';

@Injectable()
export class SeancesCalendarSessionsReader implements ICalendarSessionsReader {
  constructor(private readonly sessions: ListSessionsUseCase) {}

  async sessionsIn(from: string, to: string): Promise<CalendarSession[]> {
    const sessions = await this.sessions.execute({ from, to });
    return sessions.map((session) => ({
      id: session.id,
      date: session.date,
      disciplineTypeKey: session.disciplineTypeKey,
      durationMinutes: session.durationMinutes,
      status: session.status,
    }));
  }
}
