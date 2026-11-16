import { Inject, Injectable } from '@nestjs/common';
import { ExportWeekInvalidError } from '../../domain/errors/export-week-invalid.error.js';
import {
  WEEK_ACTIVITIES_SOURCE,
  WEEK_SESSIONS_SOURCE,
  WEEK_VOLUMES_SOURCE,
  type IWeekActivitiesSource,
  type IWeekSessionsSource,
  type IWeekVolumesSource,
  type WeekActivityDetail,
} from '../../domain/ports/outbound/week-export.ports.js';
import { parseIsoWeek } from '../../../../shared/domain/value-objects/iso-week.vo.js';
import { buildWeekExport, type WeekExportDto } from '../week-export.builder.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ExportWeekUseCase {
  constructor(
    @Inject(WEEK_SESSIONS_SOURCE)
    private readonly sessions: IWeekSessionsSource,
    @Inject(WEEK_ACTIVITIES_SOURCE)
    private readonly activities: IWeekActivitiesSource,
    @Inject(WEEK_VOLUMES_SOURCE)
    private readonly volumes: IWeekVolumesSource,
  ) {}

  /**
   * Assemble le bilan d'une semaine ISO (`AAAA-Www`) : séances de la semaine avec plan et réalisé rapproché,
   * activités réalisées sans séance, et totaux comparés à la semaine précédente. Une semaine sans données renvoie des listes vides.
   *
   * @throws ExportWeekInvalidError si le libellé de la semaine est invalide.
   */
  async execute(label: string): Promise<WeekExportDto> {
    const week = parseIsoWeek(label);
    if (week === null) {
      throw new ExportWeekInvalidError();
    }
    const monday = week.monday;
    const sunday = new Date(monday.getTime() + 6 * DAY_MS);
    const nextMonday = new Date(monday.getTime() + 7 * DAY_MS);
    const [occurrences, activities, volumes] = await Promise.all([
      this.sessions.findOccurrences(isoDay(monday), isoDay(sunday)),
      this.activities.findBetween(monday, nextMonday),
      this.volumes.findWeek(monday),
    ]);
    const linkedIds = [
      ...new Set(
        occurrences
          .map((occurrence) => occurrence.linkedActivityId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const details = new Map<string, WeekActivityDetail>();
    for (const id of linkedIds) {
      const detail = await this.activities.findDetail(id);
      if (detail !== null) {
        details.set(id, detail);
      }
    }
    return buildWeekExport({
      label: week.label,
      monday,
      sunday,
      occurrences,
      activities,
      linkedDetails: details,
      volumes,
    });
  }
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
