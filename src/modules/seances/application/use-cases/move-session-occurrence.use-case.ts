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
import type { MoveSessionOccurrenceCommand } from '../dtos/session-occurrence.dto.js';
import { loadSeriesOccurrence } from '../session-occurrence-inputs.js';
import { toCalendarDate } from '../session-inputs.js';

@Injectable()
export class MoveSessionOccurrenceUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(SESSION_OCCURRENCE_EXCEPTION_REPOSITORY)
    private readonly exceptions: ISessionOccurrenceExceptionRepository,
  ) {}

  /**
   * Déplace une occurrence d'une série vers une autre date, sans toucher aux autres semaines.
   * L'heure de la série est gardée si `startTime` est absent. Déplacer une occurrence annulée la réactive.
   * Aucune règle de chevauchement : une autre séance peut déjà occuper la date cible.
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   * @throws SessionOccurrenceNotFoundError si la date d'origine n'est pas une occurrence de la série.
   * @throws InvalidSessionError si la date ou l'heure est invalide.
   */
  async execute(
    command: MoveSessionOccurrenceCommand,
  ): Promise<SessionOccurrence> {
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
      movedDate: toCalendarDate(command.date),
      movedStartTime:
        command.startTime === undefined
          ? (current?.movedStartTime ?? null)
          : command.startTime,
      cancelled: false,
    };
    await this.exceptions.save(exception);
    return resolveOccurrence(session, date, exception);
  }
}
