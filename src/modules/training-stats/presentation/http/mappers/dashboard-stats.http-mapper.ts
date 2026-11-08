import type { DashboardStatsResult } from '../../../application/use-cases/get-dashboard-stats.use-case.js';
import type { DashboardStatsResponseDto } from '../dtos/dashboard-stats.response.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export class DashboardStatsHttpMapper {
  static toResponse(result: DashboardStatsResult): DashboardStatsResponseDto {
    const { stats, window } = result;
    return {
      period: result.period,
      from: DashboardStatsHttpMapper.toCalendarDate(window.current.from),
      to: DashboardStatsHttpMapper.toCalendarDate(
        new Date(window.current.toExclusive.getTime() - DAY_MS),
      ),
      totals: {
        count: stats.totals.count,
        durationSeconds: stats.totals.durationSeconds,
        calories: stats.totals.calories,
        elevationGainMeters: stats.totals.elevationGainMeters,
      },
      averageHeartRate: stats.averageHeartRate,
      hrTimeInZone: [...stats.hrTimeInZone],
      bySport: stats.bySport.map((entry) => ({ ...entry })),
      daily: stats.daily.map((point) => ({ ...point })),
      variation: { ...stats.variation },
    };
  }

  private static toCalendarDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
