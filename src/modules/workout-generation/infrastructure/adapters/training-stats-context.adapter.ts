import { Inject, Injectable } from '@nestjs/common';
import type { PeriodStatsDto } from '../../../training-stats/application/dtos/training-stats.dto.js';
import { GetTrainingStatsUseCase } from '../../../training-stats/application/use-cases/get-training-stats.use-case.js';
import {
  type IRecentTrainingContextProvider,
  type RecentTrainingContext,
  type RecentTrainingWeek,
} from '../../domain/ports/outbound/recent-training-context.port.js';

export const WORKOUT_CONTEXT_CLOCK = Symbol('WORKOUT_CONTEXT_CLOCK');

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

@Injectable()
export class TrainingStatsContextAdapter implements IRecentTrainingContextProvider {
  constructor(
    private readonly stats: GetTrainingStatsUseCase,
    @Inject(WORKOUT_CONTEXT_CLOCK) private readonly now: () => Date,
  ) {}

  async getRecent(weeks: number): Promise<RecentTrainingContext> {
    const range = TrainingStatsContextAdapter.completeWeeksWindow(
      this.now(),
      weeks,
    );
    const stats = await this.stats.execute({
      granularity: 'week',
      from: range.from,
      to: range.to,
      type: null,
    });
    return {
      weeks: stats.periods.map((period) =>
        TrainingStatsContextAdapter.toWeek(period),
      ),
    };
  }

  private static completeWeeksWindow(
    now: Date,
    weeks: number,
  ): { from: Date; to: Date } {
    const daysSinceMonday = (now.getUTCDay() + 6) % 7;
    const currentMonday = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
    );
    return {
      from: new Date(currentMonday - weeks * WEEK_MS),
      to: new Date(currentMonday - DAY_MS),
    };
  }

  private static toWeek(period: PeriodStatsDto): RecentTrainingWeek {
    return {
      start: period.start,
      end: period.end,
      activityCount: period.totals.count,
      durationSeconds: period.totals.durationSeconds,
      distanceMeters: period.totals.distanceMeters,
      byType: period.byType.map((entry) => ({
        type: entry.type,
        activityCount: entry.count,
        durationSeconds: entry.durationSeconds,
        distanceMeters: entry.distanceMeters,
      })),
    };
  }
}
