import { Injectable } from '@nestjs/common';
import {
  GetSessionUseCase,
  ListSessionOccurrencesUseCase,
  type SessionDto,
} from '../../../seances/index.js';
import type {
  IWeekSessionsSource,
  WeekSessionOccurrence,
} from '../../domain/ports/outbound/week-export.ports.js';

@Injectable()
export class SeancesWeekSessionsAdapter implements IWeekSessionsSource {
  constructor(
    private readonly occurrences: ListSessionOccurrencesUseCase,
    private readonly sessions: GetSessionUseCase,
  ) {}

  async findOccurrences(
    from: string,
    to: string,
  ): Promise<WeekSessionOccurrence[]> {
    const list = await this.occurrences.execute({ from, to });
    const sessionIds = [
      ...new Set(list.map((occurrence) => occurrence.sessionId)),
    ];
    const sessions = new Map<string, SessionDto>();
    for (const id of sessionIds) {
      sessions.set(id, await this.sessions.execute(id));
    }
    return list.flatMap((occurrence) => {
      const session = sessions.get(occurrence.sessionId);
      if (session === undefined) {
        return [];
      }
      return [
        {
          sessionId: occurrence.sessionId,
          date: occurrence.date,
          startTime: occurrence.startTime,
          disciplineTypeKey: occurrence.disciplineTypeKey,
          status: occurrence.status,
          durationMinutes: session.durationMinutes,
          targetDistanceMeters: session.targetDistanceMeters,
          targetHrZonePercentages: session.targetHrZonePercentages,
          modules: session.modules,
          linkedActivityId: session.activity?.id ?? null,
          achievement: session.achievement,
        },
      ];
    });
  }
}
