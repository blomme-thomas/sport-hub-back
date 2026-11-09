import { Inject, Injectable } from '@nestjs/common';
import type { SessionOccurrenceException } from '../../domain/entities/session-occurrence-exception.js';
import {
  SESSION_OCCURRENCE_EXCEPTION_REPOSITORY,
  type ISessionOccurrenceExceptionRepository,
} from '../../domain/ports/outbound/session-occurrence-exception.repository.port.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import {
  resolveOccurrence,
  type SessionOccurrence,
} from '../../domain/services/session-occurrences.js';
import type { SessionOccurrenceCommand } from '../dtos/session-occurrence.dto.js';
import { loadSeriesOccurrence } from '../session-occurrence-inputs.js';

@Injectable()
export class CancelSessionOccurrenceUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(SESSION_OCCURRENCE_EXCEPTION_REPOSITORY)
    private readonly exceptions: ISessionOccurrenceExceptionRepository,
  ) {}

  /**
   * Annule une occurrence : elle reste dans la liste avec le statut `annulee`, pour pouvoir être restaurée.
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   * @throws SessionOccurrenceNotFoundError si la date n'est pas une occurrence de la série.
   */
  async execute(command: SessionOccurrenceCommand): Promise<SessionOccurrence> {
    const { session, date } = await loadSeriesOccurrence(
      this.sessions,
      command.sessionId,
      command.occurrenceDate,
    );
    const current = await this.exceptions.findBySessionAndDate(
      session.id.toString(),
      date,
    );
    const exception: SessionOccurrenceException = {
      sessionId: session.id.toString(),
      occurrenceDate: date,
      movedDate: current?.movedDate ?? null,
      movedStartTime: current?.movedStartTime ?? null,
      cancelled: true,
    };
    await this.exceptions.save(exception);
    return resolveOccurrence(session, date, exception);
  }
}
