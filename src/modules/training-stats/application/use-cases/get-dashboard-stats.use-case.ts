import { Inject, Injectable } from '@nestjs/common';
import {
  TRAINING_ACTIVITY_READ_MODEL,
  type ITrainingActivityReadModel,
} from '../../domain/ports/outbound/training-activity.read-model.port.js';
import {
  DashboardStatsCalculator,
  type DashboardStats,
} from '../../domain/services/dashboard-stats-calculator.service.js';
import {
  DashboardPeriodWindow,
  type DashboardPeriod,
  type DashboardWindow,
} from '../../domain/value-objects/dashboard-period.vo.js';

export interface DashboardStatsResult {
  readonly period: DashboardPeriod;
  readonly window: DashboardWindow;
  readonly stats: DashboardStats;
}

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(TRAINING_ACTIVITY_READ_MODEL)
    private readonly readModel: ITrainingActivityReadModel,
    @Inject(DashboardStatsCalculator)
    private readonly calculator: DashboardStatsCalculator,
  ) {}

  /**
   * Calcule les indicateurs du tableau de bord pour une période glissante se terminant aujourd'hui (UTC),
   * avec la période précédente de même durée. Les activités enfants ne sont pas synchronisées (excludeChildren côté Garmin).
   */
  async execute(
    period: DashboardPeriod,
    now: Date = new Date(),
  ): Promise<DashboardStatsResult> {
    const window = DashboardPeriodWindow.resolve(period, now);
    return { period, window, stats: await this.computeWindow(window) };
  }

  /**
   * Calcule les indicateurs pour une fenêtre explicite (courante et précédente), par exemple une semaine ISO.
   */
  async executeForWindow(window: DashboardWindow): Promise<DashboardStats> {
    return this.computeWindow(window);
  }

  private async computeWindow(
    window: DashboardWindow,
  ): Promise<DashboardStats> {
    const [current, previous] = await Promise.all([
      this.readModel.findDashboardFacts({
        from: window.current.from,
        toExclusive: window.current.toExclusive,
        type: null,
      }),
      this.readModel.findDashboardFacts({
        from: window.previous.from,
        toExclusive: window.previous.toExclusive,
        type: null,
      }),
    ]);
    return this.calculator.compute(window, current, previous);
  }
}
