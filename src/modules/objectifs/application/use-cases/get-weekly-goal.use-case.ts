import { Inject, Injectable } from '@nestjs/common';
import { GetTrainingStatsUseCase } from '../../../training-stats/index.js';
import { InvalidGoalError } from '../../domain/errors/invalid-goal.error.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import {
  isoWeekContaining,
  parseIsoWeek,
} from '../../../../shared/domain/value-objects/iso-week.vo.js';

const HISTORY_WEEKS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeeklyGoalHistoryPointDto {
  /** Semaine ISO `AAAA-Www`. */
  week: string;
  doneSeconds: number;
}

export interface WeeklyGoalDto {
  week: string;
  /** Temps cible de la semaine, null si aucun objectif hebdomadaire n'est défini. */
  targetSeconds: number | null;
  /** Durée réalisée sur la semaine ISO (activités de la semaine, sans filtre de type). */
  doneSeconds: number;
  /** Durée réalisée des huit dernières semaines, la plus ancienne en premier, semaine demandée en dernier. */
  history: WeeklyGoalHistoryPointDto[];
}

@Injectable()
export class GetWeeklyGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goals: IGoalRepository,
    private readonly trainingStats: GetTrainingStatsUseCase,
  ) {}

  /**
   * Renvoie la cible hebdomadaire et le réalisé de la semaine ISO demandée, avec l'historique des huit dernières
   * semaines pour la mini-courbe. Le pourcentage et le statut ne sont pas calculés ici : c'est l'affichage qui les dérive.
   *
   * @throws InvalidGoalError si la semaine n'est pas une semaine ISO valide.
   */
  async execute(week: string): Promise<WeeklyGoalDto> {
    const calendar = parseIsoWeek(week);
    if (calendar === null) {
      throw new InvalidGoalError(
        'la semaine doit être une semaine ISO valide (AAAA-Www)',
      );
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
      const date = new Date(monday - (HISTORY_WEEKS - 1 - index) * 7 * DAY_MS);
      const label = isoWeekContaining(date).label;
      return { week: label, doneSeconds: doneByWeek.get(label) ?? 0 };
    });
    const target = (await this.goals.findAll({})).find(
      (goal) => goal.type === 'hebdomadaire',
    );
    return {
      week: calendar.label,
      targetSeconds: target?.targetTime?.seconds() ?? null,
      doneSeconds: history[HISTORY_WEEKS - 1]?.doneSeconds ?? 0,
      history,
    };
  }
}
