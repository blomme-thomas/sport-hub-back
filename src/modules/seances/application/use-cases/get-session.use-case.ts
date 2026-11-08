import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import { SessionDto } from '../dtos/session.dto.js';
import { loadSession } from '../session-inputs.js';

@Injectable()
export class GetSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
  ) {}

  /**
   * Renvoie une séance avec ses modules ordonnés et son journal.
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   * @throws InvalidSessionError si l'identifiant n'est pas un UUID.
   */
  async execute(id: string): Promise<SessionDto> {
    return SessionDto.fromDomain(await loadSession(this.sessions, id));
  }
}
