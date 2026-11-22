import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import { loadSession } from '../session-inputs.js';

@Injectable()
export class UnlinkSessionActivityUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
  ) {}

  /**
   * Dissocie l'activité liée à la séance. Le statut de la séance est conservé ; sans lien, l'opération ne fait rien.
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   */
  async execute(sessionId: string): Promise<void> {
    const session = await loadSession(this.sessions, sessionId);
    const unlinked = session.unlinkActivity();
    if (unlinked !== session) {
      await this.sessions.save(unlinked);
    }
  }
}
