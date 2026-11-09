import { Inject, Injectable } from '@nestjs/common';
import {
  TRAINING_ACTIVITY_READ_MODEL,
  type ITrainingActivityReadModel,
} from '../../domain/ports/outbound/training-activity.read-model.port.js';
import {
  TrainingStatsCalculator,
  type PeriodStats,
  type PreviousPeriodStats,
} from '../../domain/services/training-stats-calculator.service.js';
import type { ActivityVolume } from '../../domain/value-objects/activity-volume.vo.js';
import { sportFamilyOf } from '../../domain/value-objects/sport-family.vo.js';
import type {
  MetricVariation,
  VolumeVariation,
} from '../../domain/value-objects/volume-variation.vo.js';
import { StatsRange } from '../../domain/value-objects/stats-range.vo.js';
import type { StatsPeriod } from '../../domain/value-objects/stats-period.vo.js';
import type {
  MetricVariationDto,
  PeriodStatsDto,
  PreviousPeriodDto,
  TrainingStatsDto,
  TrainingStatsQuery,
  VariationDto,
  VolumeDto,
} from '../dtos/training-stats.dto.js';

@Injectable()
export class GetTrainingStatsUseCase {
  constructor(
    @Inject(TRAINING_ACTIVITY_READ_MODEL)
    private readonly readModel: ITrainingActivityReadModel,
    @Inject(TrainingStatsCalculator)
    private readonly calculator: TrainingStatsCalculator,
  ) {}

  /**
   * Calcule les statistiques de volume des périodes complètes de la plage, avec la période précédente et la variation.
   * Une période sans activité renvoie des zéros. Les dates `end` sont inclusives (dernière milliseconde de la période).
   *
   * @throws {InvalidStatsRangeError} si `from` est postérieur à `to`.
   * @throws {StatsRangeTooLargeError} si la plage dépasse 104 périodes.
   */
  async execute(query: TrainingStatsQuery): Promise<TrainingStatsDto> {
    const range = StatsRange.create({
      from: query.from,
      to: query.to,
      granularity: query.granularity,
    });
    const facts = await this.readModel.findFacts({
      ...range.queryWindow(),
      type: query.type,
    });
    const periods = this.calculator.compute(range, facts, query.type);
    return {
      granularity: query.granularity,
      from: query.from,
      to: query.to,
      type: query.type,
      periods: periods.map((stats) =>
        GetTrainingStatsUseCase.toPeriodDto(stats),
      ),
    };
  }

  private static toPeriodDto(stats: PeriodStats): PeriodStatsDto {
    return {
      start: stats.period.start,
      end: GetTrainingStatsUseCase.inclusiveEnd(stats.period),
      totals: GetTrainingStatsUseCase.toVolumeDto(stats.totals),
      byType: stats.byType.map((entry) => ({
        type: entry.type,
        family: sportFamilyOf(entry.type),
        ...GetTrainingStatsUseCase.toVolumeDto(entry.volume),
      })),
      previous: GetTrainingStatsUseCase.toPreviousDto(stats.previous),
      variation: {
        totals: GetTrainingStatsUseCase.toVariationDto(stats.variation.totals),
        byType: stats.variation.byType.map((entry) => ({
          type: entry.type,
          ...GetTrainingStatsUseCase.toVariationDto(entry.variation),
        })),
      },
    };
  }

  private static toPreviousDto(
    previous: PreviousPeriodStats,
  ): PreviousPeriodDto {
    return {
      start: previous.period.start,
      end: GetTrainingStatsUseCase.inclusiveEnd(previous.period),
      totals: GetTrainingStatsUseCase.toVolumeDto(previous.totals),
      byType: previous.byType.map((entry) => ({
        type: entry.type,
        family: sportFamilyOf(entry.type),
        ...GetTrainingStatsUseCase.toVolumeDto(entry.volume),
      })),
    };
  }

  private static inclusiveEnd(period: StatsPeriod): Date {
    return new Date(period.end.getTime() - 1);
  }

  private static toVolumeDto(volume: ActivityVolume): VolumeDto {
    return {
      count: volume.count,
      durationSeconds: volume.durationSeconds,
      distanceMeters: volume.distanceMeters,
    };
  }

  private static toVariationDto(variation: VolumeVariation): VariationDto {
    return {
      count: GetTrainingStatsUseCase.toMetricDto(variation.count),
      durationSeconds: GetTrainingStatsUseCase.toMetricDto(
        variation.durationSeconds,
      ),
      distanceMeters: GetTrainingStatsUseCase.toMetricDto(
        variation.distanceMeters,
      ),
    };
  }

  private static toMetricDto(metric: MetricVariation): MetricVariationDto {
    return { absolute: metric.absolute, percent: metric.percent };
  }
}
