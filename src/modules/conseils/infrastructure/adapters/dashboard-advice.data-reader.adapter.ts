import { Injectable } from '@nestjs/common';
import {
  GetHeartRateZonesUseCase,
  GetRecoveryUseCase,
} from '../../../garmin-sync/index.js';
import {
  GetDashboardStatsUseCase,
  type DashboardWindow,
} from '../../../training-stats/index.js';
import type {
  DashboardAdviceData,
  IDashboardAdviceDataReader,
} from '../../domain/ports/outbound/dashboard-advice.ports.js';
import type { IsoWeek } from '../../domain/value-objects/iso-week.vo.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * ACL vers les façades de `training-stats` et `garmin-sync`. Ne transmet que des indicateurs chiffrés :
 * ni `displayName`, ni clé, ni token, ni payload brut.
 */
@Injectable()
export class DashboardAdviceDataReaderAdapter implements IDashboardAdviceDataReader {
  constructor(
    private readonly stats: GetDashboardStatsUseCase,
    private readonly recovery: GetRecoveryUseCase,
    private readonly zones: GetHeartRateZonesUseCase,
  ) {}

  async readWeek(week: IsoWeek): Promise<DashboardAdviceData> {
    const window: DashboardWindow = {
      current: {
        from: week.monday,
        toExclusive: new Date(week.monday.getTime() + 7 * DAY_MS),
      },
      previous: { from: week.previousMonday, toExclusive: week.monday },
    };
    const [stats, recovery, zones] = await Promise.all([
      this.stats.executeForWindow(window),
      this.recovery.execute({
        from: toDateOnly(week.monday),
        to: toDateOnly(week.sunday),
      }),
      this.zones.execute(),
    ]);
    return {
      week: week.label,
      stats: {
        count: stats.totals.count,
        durationSeconds: stats.totals.durationSeconds,
        calories: stats.totals.calories,
        elevationGainMeters: stats.totals.elevationGainMeters,
        averageHeartRate: stats.averageHeartRate,
        hrTimeInZoneSeconds: stats.hrTimeInZone,
        bySport: stats.bySport.map((entry) => ({ ...entry })),
        variationDirection: stats.variation.direction,
        variationPercent: stats.variation.percent,
      },
      recovery: recovery.map((day) => ({
        date: day.date,
        sleepSeconds: day.sleepSeconds,
        hrvLastNightAvg: day.hrvLastNightAvg,
        hrvWeeklyAvg: day.hrvWeeklyAvg,
        bodyBatteryCharged: day.bodyBatteryCharged,
        bodyBatteryDrained: day.bodyBatteryDrained,
        restingHeartRate: day.restingHeartRate,
      })),
      zones: {
        available: zones.available,
        trainingMethod: zones.trainingMethod,
        maxHeartRateUsed: zones.maxHeartRateUsed,
        restingHeartRateUsed: zones.restingHeartRateUsed,
        zoneFloors: [
          zones.zone1Floor,
          zones.zone2Floor,
          zones.zone3Floor,
          zones.zone4Floor,
          zones.zone5Floor,
        ],
      },
    };
  }
}
