import { Inject, Injectable } from '@nestjs/common';
import { InvalidSessionError } from '../../domain/errors/invalid-session.error.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import { type ListSessionsQuery, SessionDto } from '../dtos/session.dto.js';
import { toCalendarDate } from '../session-inputs.js';

const MAX_PERIOD_DAYS = 365;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

@Injectable()
export class ListSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
  ) {}

  /**
   * Liste les séances dont la date est comprise entre `from` et `to`, bornes incluses ; la période compte au plus 366 jours.
   *
   * @throws InvalidSessionError si `to` précède `from` ou si la période dépasse 366 jours.
   */
  async execute(query: ListSessionsQuery): Promise<SessionDto[]> {
    const from = toCalendarDate(query.from);
    const to = toCalendarDate(query.to);
    const elapsedDays = (to.getTime() - from.getTime()) / DAY_IN_MILLISECONDS;
    if (elapsedDays < 0) {
      throw new InvalidSessionError(
        'la date de fin de la période précède la date de début',
      );
    }
    if (elapsedDays > MAX_PERIOD_DAYS) {
      throw new InvalidSessionError(
        `la période dépasse ${MAX_PERIOD_DAYS + 1} jours`,
      );
    }
    const sessions = await this.sessions.findByPeriod({ from, to });
    return sessions.map((session) => SessionDto.fromDomain(session));
  }
}
