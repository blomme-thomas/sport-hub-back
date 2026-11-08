import { Injectable } from '@nestjs/common';
import { GetTrainingStatsUseCase } from '../../../training-stats/index.js';
import { ListSessionsUseCase } from '../../../seances/index.js';
import type { IsoWeek } from '../../domain/value-objects/iso-week.vo.js';
import type {
  IWeeklyDataReader,
  WeeklyDataReference,
} from '../../domain/ports/outbound/weekly-review.ports.js';

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class WeeklyDataReaderAdapter implements IWeeklyDataReader {
  constructor(
    private readonly sessions: ListSessionsUseCase,
    private readonly stats: GetTrainingStatsUseCase,
  ) {}

  async readWeek(week: IsoWeek): Promise<WeeklyDataReference> {
    const sessions = await this.sessions.execute({
      from: toDateOnly(week.monday),
      to: toDateOnly(week.sunday),
    });
    const stats = await this.stats.execute({
      granularity: 'week',
      from: week.previousMonday,
      to: week.monday,
      type: null,
    });
    const current = stats.periods[stats.periods.length - 1];
    if (current === undefined) {
      throw new Error('Statistiques de la semaine absentes');
    }
    return {
      planned: sessions.map((session) => ({
        date: session.date,
        disciplineTypeKey: session.disciplineTypeKey,
        durationMinutes: session.durationMinutes,
        status: session.status,
      })),
      current: current.totals,
      previous: current.previous.totals,
    };
  }
}
