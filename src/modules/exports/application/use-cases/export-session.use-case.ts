import { Inject, Injectable } from '@nestjs/common';
import { ExportSessionNotFoundError } from '../../domain/errors/export-session-not-found.error.js';
import {
  SESSION_EXPORT_SOURCE,
  type ISessionExportSource,
} from '../../domain/ports/outbound/session-export.port.js';
import {
  WEEK_ACTIVITIES_SOURCE,
  type IWeekActivitiesSource,
} from '../../domain/ports/outbound/week-export.ports.js';
import {
  buildSessionExport,
  type SessionExportDto,
} from '../session-export.builder.js';

@Injectable()
export class ExportSessionUseCase {
  constructor(
    @Inject(SESSION_EXPORT_SOURCE)
    private readonly sessions: ISessionExportSource,
    @Inject(WEEK_ACTIVITIES_SOURCE)
    private readonly activities: IWeekActivitiesSource,
  ) {}

  /**
   * Assemble le bilan d'une séance : plan, réalisé rapproché et atteinte. Une séance sans activité rapprochée
   * renvoie un réalisé vide, sans erreur.
   *
   * @throws ExportSessionNotFoundError si la séance n'existe pas.
   */
  async execute(id: string): Promise<SessionExportDto> {
    const occurrence = await this.sessions.findSession(id);
    if (occurrence === null) {
      throw new ExportSessionNotFoundError();
    }
    const linked =
      occurrence.linkedActivityId === null
        ? null
        : await this.activities.findDetail(occurrence.linkedActivityId);
    return buildSessionExport(occurrence, linked);
  }
}
