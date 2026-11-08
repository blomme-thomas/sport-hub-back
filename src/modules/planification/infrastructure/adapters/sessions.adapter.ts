import { Injectable } from '@nestjs/common';
import { ListSessionsUseCase } from '../../../seances/application/use-cases/list-sessions.use-case.js';
import type { PlanningPeriod } from '../../domain/ports/outbound/slot-occurrences.provider.port.js';
import type { ISessionsProvider } from '../../domain/ports/outbound/sessions.provider.port.js';
import type { SessionSnapshot } from '../../domain/services/free-slot-capacity.calculator.js';

@Injectable()
export class SeancesSessionsAdapter implements ISessionsProvider {
  constructor(private readonly sessions: ListSessionsUseCase) {}

  async sessionsIn(period: PlanningPeriod): Promise<SessionSnapshot[]> {
    const sessions = await this.sessions.execute(period);
    return sessions.map((session) => ({
      date: session.date,
      durationMinutes: session.durationMinutes,
      status: session.status,
      modifiedManually: session.modifiedManually,
      disciplineTypeKey: session.disciplineTypeKey,
    }));
  }
}
