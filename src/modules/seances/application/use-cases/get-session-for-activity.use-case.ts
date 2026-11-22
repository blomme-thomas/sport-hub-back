import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';

export interface LinkedSessionDto {
  date: string;
  disciplineTypeKey: string;
  durationMinutes: number;
  status: string;
}

@Injectable()
export class GetSessionForActivityUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
  ) {}

  /**
   * Renvoie la séance liée à l'activité (prévu), ou null si aucune séance n'est liée.
   */
  async execute(activityId: string): Promise<LinkedSessionDto | null> {
    const [session] = await this.sessions.findByActivityIds([activityId]);
    if (session === undefined) {
      return null;
    }
    return {
      date: session.date.toISOString().slice(0, 10),
      disciplineTypeKey: session.disciplineTypeKey,
      durationMinutes: session.durationMinutes,
      status: session.status,
    };
  }
}
