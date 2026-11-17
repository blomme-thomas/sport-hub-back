import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { GetSessionUseCase, type SessionDto } from '../../../seances/index.js';
import type { ISessionExportSource } from '../../domain/ports/outbound/session-export.port.js';
import type { WeekSessionOccurrence } from '../../domain/ports/outbound/week-export.ports.js';

const SESSION_NOT_FOUND = 'SESSION_NOT_FOUND';

@Injectable()
export class SeancesSessionExportAdapter implements ISessionExportSource {
  constructor(private readonly sessions: GetSessionUseCase) {}

  async findSession(id: string): Promise<WeekSessionOccurrence | null> {
    let session: SessionDto;
    try {
      session = await this.sessions.execute(id);
    } catch (error) {
      if (error instanceof DomainError && error.code === SESSION_NOT_FOUND) {
        return null;
      }
      throw error;
    }
    return {
      sessionId: session.id,
      date: session.date,
      startTime: session.startTime,
      disciplineTypeKey: session.disciplineTypeKey,
      status: session.status,
      durationMinutes: session.durationMinutes,
      targetDistanceMeters: session.targetDistanceMeters,
      targetHrZonePercentages: session.targetHrZonePercentages,
      modules: session.modules,
      linkedActivityId: session.activity?.id ?? null,
      achievement: session.achievement,
    };
  }
}
