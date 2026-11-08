import { Inject, Injectable } from '@nestjs/common';
import type { Session } from '../../domain/entities/session.entity.js';
import {
  ACTIVITY_CATALOG,
  type IActivityCatalog,
} from '../../domain/ports/outbound/activity-catalog.port.js';
import {
  SEANCES_CLOCK,
  type SeancesClock,
} from '../../domain/ports/outbound/seances-clock.port.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import {
  type ReconciliationPair,
  type ReconciliationSession,
  reconcileSessionsWithActivities,
} from '../../domain/services/activity-reconciliation.js';
import type { ReconcileSessionsQuery } from '../dtos/session.dto.js';
import { assertPeriod, toCalendarDate } from '../session-inputs.js';

@Injectable()
export class ReconcileSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(ACTIVITY_CATALOG)
    private readonly activities: IActivityCatalog,
    @Inject(SEANCES_CLOCK)
    private readonly clock: SeancesClock,
  ) {}

  /**
   * Rapproche automatiquement les séances planifiées de la période avec les activités du même jour et de la même discipline.
   * Seuls les cas sans ambiguïté sont liés : la séance passe à réalisée, avec un lien d'origine automatique. Les autres restent en attente.
   *
   * @throws InvalidSessionError si la période est inversée ou dépasse 366 jours.
   */
  async execute(query: ReconcileSessionsQuery): Promise<ReconciliationPair[]> {
    const from = toCalendarDate(query.from);
    const to = toCalendarDate(query.to);
    assertPeriod(from, to);

    const sessions = await this.sessions.findByPeriod({ from, to });
    const activities = await this.activities.activitiesOnDays(
      query.from,
      query.to,
    );
    const linkedElsewhere = await this.sessions.findByActivityIds(
      activities.map((activity) => activity.id),
    );
    const linkedIds = new Set(
      linkedElsewhere.flatMap((session) =>
        session.activityLink ? [session.activityLink.activityId] : [],
      ),
    );

    const pairs = reconcileSessionsWithActivities(
      sessions.map(toReconciliationSession),
      activities,
      linkedIds,
    );
    const now = this.clock();
    for (const pair of pairs) {
      const session = sessions.find(
        (candidate) => candidate.id.toString() === pair.sessionId,
      );
      if (session) {
        await this.sessions.save(
          session.linkActivity(pair.activityId, 'automatique', now),
        );
      }
    }
    return pairs;
  }
}

function toReconciliationSession(session: Session): ReconciliationSession {
  return {
    id: session.id.toString(),
    date: session.date.toISOString().slice(0, 10),
    disciplineTypeKey: session.disciplineTypeKey,
    status: session.status,
    activityId: session.activityLink?.activityId ?? null,
  };
}
