import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import { loadSession } from '../session-inputs.js';

@Injectable()
export class DeleteSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
  ) {}

  /**
   * Supprime une séance, réalisée ou non, ainsi que ses modules et son journal.
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   */
  async execute(id: string): Promise<void> {
    const session = await loadSession(this.sessions, id);
    await this.sessions.delete(session.id);
  }
}
