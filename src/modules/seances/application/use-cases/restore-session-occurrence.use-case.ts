import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_OCCURRENCE_EXCEPTION_REPOSITORY,
  type ISessionOccurrenceExceptionRepository,
} from '../../domain/ports/outbound/session-occurrence-exception.repository.port.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import type { SessionOccurrenceCommand } from '../dtos/session-occurrence.dto.js';
import { loadSeriesOccurrence } from '../session-occurrence-inputs.js';

@Injectable()
export class RestoreSessionOccurrenceUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(SESSION_OCCURRENCE_EXCEPTION_REPOSITORY)
    private readonly exceptions: ISessionOccurrenceExceptionRepository,
  ) {}

  /**
   * Restaure une occurrence à sa programmation initiale en supprimant son exception. Sans effet si elle n'en a pas.
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   * @throws SessionOccurrenceNotFoundError si la date n'est pas une occurrence de la série.
   */
  async execute(command: SessionOccurrenceCommand): Promise<void> {
    const { session, date } = await loadSeriesOccurrence(
      this.sessions,
      command.sessionId,
      command.occurrenceDate,
    );
    await this.exceptions.delete(session.id.toString(), date);
  }
}
