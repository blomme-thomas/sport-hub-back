import { Inject, Injectable } from '@nestjs/common';
import { UnknownSessionDisciplineError } from '../../domain/errors/unknown-session-discipline.error.js';
import {
  DISCIPLINE_CATALOG,
  type IDisciplineCatalog,
} from '../../domain/ports/outbound/discipline-catalog.port.js';
import {
  SEANCES_CLOCK,
  type SeancesClock,
} from '../../domain/ports/outbound/seances-clock.port.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import { type UpdateSessionCommand, SessionDto } from '../dtos/session.dto.js';
import { loadSession, toCalendarDate } from '../session-inputs.js';

@Injectable()
export class UpdateSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessions: ISessionRepository,
    @Inject(DISCIPLINE_CATALOG)
    private readonly disciplines: IDisciplineCatalog,
    @Inject(SEANCES_CLOCK)
    private readonly clock: SeancesClock,
  ) {}

  /**
   * Modifie une séance : les champs absents gardent leur valeur, null efface description, matériel ou points d'attention.
   * Toute modification réelle positionne `modifiedManually` et est journalisée ; une discipline fournie doit exister dans le référentiel.
   *
   * @throws SessionNotFoundError si la séance n'existe pas.
   * @throws SessionAlreadyCompletedError si la séance est réalisée.
   * @throws InvalidSessionError si une valeur est invalide.
   * @throws UnknownSessionDisciplineError si la discipline fournie est absente du référentiel.
   */
  async execute(command: UpdateSessionCommand): Promise<SessionDto> {
    const session = await loadSession(this.sessions, command.id);
    const updated = session.change(
      {
        date:
          command.date === undefined ? undefined : toCalendarDate(command.date),
        disciplineTypeKey: command.disciplineTypeKey,
        durationMinutes: command.durationMinutes,
        startTime: command.startTime,
        recurrence: command.recurrence,
        targetDistanceMeters: command.targetDistanceMeters,
        targetHrZonePercentages: command.targetHrZonePercentages,
        status: command.status,
        description: command.description,
        equipment: command.equipment,
        attentionPoints: command.attentionPoints,
      },
      this.clock(),
    );
    if (
      command.disciplineTypeKey !== undefined &&
      !(await this.disciplines.exists(updated.disciplineTypeKey))
    ) {
      throw new UnknownSessionDisciplineError();
    }
    await this.sessions.save(updated);
    return SessionDto.fromDomain(updated);
  }
}
