import { Inject, Injectable } from '@nestjs/common';
import { calendarDay } from '../../../../shared/domain/value-objects/calendar-day.js';
import { isoWeekContaining } from '../../../../shared/domain/value-objects/iso-week.vo.js';
import { ExportMonthInvalidError } from '../../domain/errors/export-month-invalid.error.js';
import {
  WEEK_ACTIVITIES_SOURCE,
  WEEK_SESSIONS_SOURCE,
  type IWeekActivitiesSource,
  type IWeekSessionsSource,
  type WeekActivityDetail,
} from '../../domain/ports/outbound/week-export.ports.js';
import { parseExportMonth } from '../../domain/value-objects/export-month.vo.js';
import {
  buildMonthExport,
  type MonthExportDto,
  type MonthWeek,
} from '../month-export.builder.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ExportMonthUseCase {
  constructor(
    @Inject(WEEK_SESSIONS_SOURCE)
    private readonly sessions: IWeekSessionsSource,
    @Inject(WEEK_ACTIVITIES_SOURCE)
    private readonly activities: IWeekActivitiesSource,
  ) {}

  /**
   * Assemble le bilan d'un mois calendaire (`AAAA-MM`) : séances et activités du mois, regroupées par semaine ISO.
   * Un mois sans données renvoie des listes vides.
   *
   * @throws ExportMonthInvalidError si le libellé du mois est invalide.
   */
  async execute(label: string): Promise<MonthExportDto> {
    const month = parseExportMonth(label);
    if (month === null) {
      throw new ExportMonthInvalidError();
    }
    const weeks = monthWeeks(month.first, month.last);
    const from = weeks[0].monday;
    const lastSunday = weeks[weeks.length - 1].sunday;
    const nextMonday = new Date(lastSunday.getTime() + DAY_MS);
    const [occurrences, activities] = await Promise.all([
      this.sessions.findOccurrences(calendarDay(from), calendarDay(lastSunday)),
      this.activities.findBetween(from, nextMonday),
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
    return buildMonthExport({
      label: month.label,
      first: month.first,
      last: month.last,
      weeks,
      occurrences,
      activities,
      linkedDetails: details,
    });
  }
}

/** Semaines ISO qui touchent le mois, du lundi de la première au dimanche de la dernière. */
function monthWeeks(first: Date, last: Date): MonthWeek[] {
  const weeks: MonthWeek[] = [];
  const start = isoWeekContaining(first);
  const end = isoWeekContaining(last);
  for (
    let monday = start.monday.getTime();
    monday <= end.monday.getTime();
    monday += 7 * DAY_MS
  ) {
    const week = isoWeekContaining(new Date(monday));
    weeks.push({
      label: week.label,
      monday: week.monday,
      sunday: new Date(week.monday.getTime() + 6 * DAY_MS),
    });
  }
  return weeks;
}
