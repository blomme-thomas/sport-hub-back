import { Inject, Injectable } from '@nestjs/common';
import {
  SEANCES_CLOCK,
  type SeancesClock,
} from '../../domain/ports/outbound/seances-clock.port.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import {
  type ReplaceSessionModulesCommand,
  SessionDto,
} from '../dtos/session.dto.js';
import { buildSessionModules, loadSession } from '../session-inputs.js';

@Injectable()
export class ReplaceSessionModulesUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(SEANCES_CLOCK)
    private readonly clock: SeancesClock,
  ) {}

  /**
   * Remplace la liste ordonnée des modules d'une séance et renumérote les positions de 1 à n.
   * Une liste identique à la liste courante ne journalise rien.
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   * @throws SessionAlreadyCompletedError si la séance est réalisée.
   * @throws InvalidSessionModuleError si un module est invalide.
   * @throws InvalidSessionError si la liste dépasse 30 modules.
   */
  async execute(command: ReplaceSessionModulesCommand): Promise<SessionDto> {
    const session = await loadSession(this.sessions, command.id);
    const updated = session.replaceModules(
      buildSessionModules(command.modules),
      this.clock(),
    );
    await this.sessions.save(updated);
    return SessionDto.fromDomain(updated);
  }
}
