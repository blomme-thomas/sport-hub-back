import { Inject, Injectable } from '@nestjs/common';
import { SessionActivityAlreadyLinkedError } from '../../domain/errors/session-activity-already-linked.error.js';
import { SessionActivityNotFoundError } from '../../domain/errors/session-activity-not-found.error.js';
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
  type LinkSessionActivityCommand,
  SessionDto,
} from '../dtos/session.dto.js';
import { loadSession } from '../session-inputs.js';

@Injectable()
export class LinkSessionActivityUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(ACTIVITY_CATALOG)
    private readonly activities: IActivityCatalog,
    @Inject(SEANCES_CLOCK)
    private readonly clock: SeancesClock,
  ) {}

  /**
   * Associe manuellement une activité à une séance. L'activité doit être du même jour que la séance ; une activité déjà liée à une autre séance ne peut pas l'être.
   * Remplace le lien précédent de la séance, s'il existe. La séance planifiée ou manquée passe à réalisée.
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   * @throws SessionActivityNotFoundError si l'activité n'existe pas à la date de la séance.
   * @throws SessionActivityAlreadyLinkedError si l'activité est liée à une autre séance.
   */
  async execute(command: LinkSessionActivityCommand): Promise<SessionDto> {
    const session = await loadSession(this.sessions, command.sessionId);
    const day = session.date.toISOString().slice(0, 10);
    const sameDay = await this.activities.activitiesOnDays(day, day);
    if (!sameDay.some((activity) => activity.id === command.activityId)) {
      throw new SessionActivityNotFoundError();
    }
    const [holder] = await this.sessions.findByActivityIds([
      command.activityId,
    ]);
    if (holder && holder.id.toString() !== session.id.toString()) {
      throw new SessionActivityAlreadyLinkedError();
    }
    const linked = session.linkActivity(
      command.activityId,
      'manuel',
      this.clock(),
    );
    await this.sessions.save(linked);
    return SessionDto.fromDomain(linked);
  }
}
