import { Injectable } from '@nestjs/common';
import {
  GetTrainingStatsUseCase,
  type VolumeDto,
} from '../../../training-stats/index.js';
import type {
  IWeekVolumesSource,
  WeekVolume,
  WeekVolumes,
} from '../../domain/ports/outbound/week-export.ports.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY: WeekVolume = { count: 0, durationSeconds: 0, distanceMeters: 0 };

@Injectable()
export class TrainingStatsWeekVolumesAdapter implements IWeekVolumesSource {
  constructor(private readonly stats: GetTrainingStatsUseCase) {}

  async findWeek(monday: Date): Promise<WeekVolumes> {
    const sunday = new Date(monday.getTime() + 6 * DAY_MS);
    const result = await this.stats.execute({
      granularity: 'week',
      from: new Date(monday.getTime() - 7 * DAY_MS),
      to: sunday,
      type: null,
    });
    const period = result.periods.find(
      (candidate) => candidate.start.getTime() === monday.getTime(),
    );
    if (period === undefined) {
      return {
        current: EMPTY,
        previous: EMPTY,
        variation: { count: null, durationSeconds: null, distanceMeters: null },
      };
    }
    return {
      current: toWeekVolume(period.totals),
      previous: toWeekVolume(period.previous.totals),
      variation: {
        count: period.variation.totals.count.percent,
        durationSeconds: period.variation.totals.durationSeconds.percent,
        distanceMeters: period.variation.totals.distanceMeters.percent,
      },
    };
  }
}

function toWeekVolume(volume: VolumeDto): WeekVolume {
  return {
    count: volume.count,
    durationSeconds: volume.durationSeconds,
    distanceMeters: volume.distanceMeters,
  };
}
