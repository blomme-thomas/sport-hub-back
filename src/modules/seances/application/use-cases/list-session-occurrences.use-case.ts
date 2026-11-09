import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_OCCURRENCE_EXCEPTION_REPOSITORY,
  type ISessionOccurrenceExceptionRepository,
} from '../../domain/ports/outbound/session-occurrence-exception.repository.port.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import {
  occurrencesInPeriod,
  type SessionOccurrence,
} from '../../domain/services/session-occurrences.js';
import type { ListSessionsQuery } from '../dtos/session.dto.js';
import { assertPeriod, toCalendarDate } from '../session-inputs.js';

@Injectable()
export class ListSessionOccurrencesUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(SESSION_OCCURRENCE_EXCEPTION_REPOSITORY)
    private readonly exceptions: ISessionOccurrenceExceptionRepository,
  ) {}

  /**
   * Liste les occurrences dont la date, après déplacement éventuel, tombe entre `from` et `to` (bornes incluses) ; la période compte au plus 366 jours.
   * Les occurrences annulées restent listées avec le statut `annulee`. Triées par date, puis heure (absente en premier), puis identifiant de séance.
   *
   * @throws InvalidSessionError si `to` précède `from` ou si la période dépasse 366 jours.
   */
  async execute(query: ListSessionsQuery): Promise<SessionOccurrence[]> {
    const from = toCalendarDate(query.from);
    const to = toCalendarDate(query.to);
    assertPeriod(from, to);
    const candidates = await this.sessions.findOccurrenceCandidates({
      from,
      to,
    });
    const exceptions = await this.exceptions.findBySessionIds(
      candidates.map((session) => session.id.toString()),
    );
    return candidates
      .flatMap((session) =>
        occurrencesInPeriod(
          session,
          exceptions.filter(
            (exception) => exception.sessionId === session.id.toString(),
          ),
          from,
          to,
        ),
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
          a.sessionId.localeCompare(b.sessionId),
      );
  }
}
