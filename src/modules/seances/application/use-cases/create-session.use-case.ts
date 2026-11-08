import { Inject, Injectable } from '@nestjs/common';
import { Session } from '../../domain/entities/session.entity.js';
import { UnknownSessionDisciplineError } from '../../domain/errors/unknown-session-discipline.error.js';
import {
  DISCIPLINE_CATALOG,
  type IDisciplineCatalog,
} from '../../domain/ports/outbound/discipline-catalog.port.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import { type CreateSessionCommand, SessionDto } from '../dtos/session.dto.js';
import { buildSessionModules, toCalendarDate } from '../session-inputs.js';

@Injectable()
export class CreateSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(DISCIPLINE_CATALOG)
    private readonly disciplines: IDisciplineCatalog,
  ) {}

  /**
   * Crée une séance planifiée avec ses modules ordonnés, après vérification de la discipline dans le référentiel.
   *
   * @throws InvalidSessionError si un champ de la séance est invalide ou si elle dépasse 30 modules.
   * @throws InvalidSessionModuleError si un module est invalide.
   * @throws UnknownSessionDisciplineError si la discipline est absente du référentiel.
   */
  async execute(command: CreateSessionCommand): Promise<SessionDto> {
    const session = Session.create({
      date: toCalendarDate(command.date),
      disciplineTypeKey: command.disciplineTypeKey,
      durationMinutes: command.durationMinutes,
      startTime: command.startTime,
      description: command.description,
      equipment: command.equipment,
      attentionPoints: command.attentionPoints,
      modules: buildSessionModules(command.modules ?? []),
    });
    if (!(await this.disciplines.exists(session.disciplineTypeKey))) {
      throw new UnknownSessionDisciplineError();
    }
    await this.sessions.save(session);
    return SessionDto.fromDomain(session);
  }
}
