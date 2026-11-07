import type { StatsGranularity } from '../../domain/value-objects/stats-granularity.vo.js';

export interface TrainingStatsQuery {
  granularity: StatsGranularity;
  from: Date;
  to: Date;
  type: string | null;
}

export interface VolumeDto {
  count: number;
  durationSeconds: number;
  distanceMeters: number;
}

export interface TypeVolumeDto extends VolumeDto {
  type: string;
}

export interface MetricVariationDto {
  absolute: number;
  percent: number | null;
}

export interface VariationDto {
  count: MetricVariationDto;
  durationSeconds: MetricVariationDto;
  distanceMeters: MetricVariationDto;
}

export interface TypeVariationDto extends VariationDto {
  type: string;
}

export interface PreviousPeriodDto {
  start: Date;
  end: Date;
  totals: VolumeDto;
  byType: TypeVolumeDto[];
}

export interface PeriodStatsDto {
  start: Date;
  end: Date;
  totals: VolumeDto;
  byType: TypeVolumeDto[];
  previous: PreviousPeriodDto;
  variation: {
    totals: VariationDto;
    byType: TypeVariationDto[];
  };
}

export interface TrainingStatsDto {
  granularity: StatsGranularity;
  from: Date;
  to: Date;
  type: string | null;
  periods: PeriodStatsDto[];
}
