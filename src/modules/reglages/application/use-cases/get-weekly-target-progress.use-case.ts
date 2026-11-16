import { Inject, Injectable } from '@nestjs/common';
import {
  isoWeekContaining,
  parseIsoWeek,
} from '../../../../shared/domain/value-objects/iso-week.vo.js';
import { GetTrainingStatsUseCase } from '../../../training-stats/index.js';
import { InvalidWeekError } from '../../domain/errors/invalid-week.error.js';
import {
  type IUserSettingsRepository,
  USER_SETTINGS_REPOSITORY,
} from '../../domain/ports/outbound/user-settings.repository.port.js';

const HISTORY_WEEKS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeeklyTargetProgressDto {
  /** Semaine ISO `AAAA-Www`. */
  week: string;
  /** Cible réglée dans les paramètres, null si elle n'est pas définie. */
  targetSeconds: number | null;
  /** Durée réalisée sur la semaine ISO (sans filtre de type). */
  doneSeconds: number;
  /** Huit dernières semaines, la plus ancienne en premier, semaine demandée en dernier. */
  history: { week: string; doneSeconds: number }[];
}

/**
 * Cible hebdomadaire et réalisé de la semaine ISO demandée, avec l'historique des huit dernières semaines.
 * Le pourcentage et le statut ne sont pas calculés ici : c'est l'affichage qui les dérive.
 *
 * @throws InvalidWeekError si la semaine n'est pas une semaine ISO valide.
 */
@Injectable()
export class GetWeeklyTargetProgressUseCase {
  constructor(
    @Inject(USER_SETTINGS_REPOSITORY)
    private readonly settings: IUserSettingsRepository,
    private readonly trainingStats: GetTrainingStatsUseCase,
  ) {}

  async execute(week: string): Promise<WeeklyTargetProgressDto> {
    const calendar = parseIsoWeek(week);
    if (calendar === null) {
      throw new InvalidWeekError();
    }
    const monday = calendar.monday.getTime();
    const stats = await this.trainingStats.execute({
      granularity: 'week',
      from: new Date(monday - (HISTORY_WEEKS - 1) * 7 * DAY_MS),
      to: new Date(monday + 6 * DAY_MS),
      type: null,
    });
    const doneByWeek = new Map(
      stats.periods.map((period) => [
        isoWeekContaining(period.start).label,
        period.totals.durationSeconds,
      ]),
    );
    const history = Array.from({ length: HISTORY_WEEKS }, (_, index) => {
      const label = isoWeekContaining(
        new Date(monday - (HISTORY_WEEKS - 1 - index) * 7 * DAY_MS),
      ).label;
      return { week: label, doneSeconds: doneByWeek.get(label) ?? 0 };
    });
    const target = await this.settings.findWeeklyTarget();
    return {
      week: calendar.label,
      targetSeconds: target.seconds(),
      doneSeconds: history[HISTORY_WEEKS - 1]?.doneSeconds ?? 0,
      history,
    };
  }
}
