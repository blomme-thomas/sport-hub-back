import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import {
  SESSION_ACTIVITY_METRICS,
  type ISessionActivityMetrics,
} from '../../domain/ports/outbound/session-activity-metrics.port.js';
import {
  computeAchievement,
  type SessionAchievement,
} from '../../domain/services/session-achievement.js';
import { SessionDto } from '../dtos/session.dto.js';
import { loadSession } from '../session-inputs.js';

@Injectable()
export class GetSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(SESSION_ACTIVITY_METRICS)
    private readonly metrics: ISessionActivityMetrics,
  ) {}

  /**
   * Renvoie une séance avec ses modules ordonnés, son journal et, si elle a des objectifs et une activité liée,
   * ses métriques de réalisation (lues en base, sans appel à Garmin).
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   * @throws InvalidSessionError si l'identifiant n'est pas un UUID.
   */
  async execute(id: string): Promise<SessionDto> {
    const session = await loadSession(this.sessions, id);
    const link = session.activityLink;
    const hasTargets =
      session.targetDistanceMeters !== null ||
      session.targetHrZonePercentages !== null;
    let achievement: SessionAchievement | null = null;
    if (link !== null && hasTargets) {
      const activity = await this.metrics.findByActivityId(link.activityId);
      if (activity !== null) {
        achievement = computeAchievement(
          {
            targetDistanceMeters: session.targetDistanceMeters,
            durationMinutes: session.durationMinutes,
            targetHrZonePercentages: session.targetHrZonePercentages,
          },
          activity,
        );
      }
    }
    return SessionDto.fromDomain(session, achievement);
  }
}
