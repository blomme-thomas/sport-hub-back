import type { TrainingStatsDto } from '../../../application/dtos/training-stats.dto.js';
import type { GetTrainingStatsRequestDto } from '../dtos/get-training-stats.request.dto.js';
import { TrainingStatsResponseDto } from '../dtos/training-stats.response.dto.js';

export class TrainingStatsHttpMapper {
  static toQuery(request: GetTrainingStatsRequestDto) {
    return {
      granularity: request.granularity,
      from: new Date(`${request.from}T00:00:00.000Z`),
      to: new Date(`${request.to}T00:00:00.000Z`),
      type: request.type ?? null,
    };
  }

  static toResponse(stats: TrainingStatsDto): TrainingStatsResponseDto {
    return Object.assign(new TrainingStatsResponseDto(), {
      granularity: stats.granularity,
      from: TrainingStatsHttpMapper.toCalendarDate(stats.from),
      to: TrainingStatsHttpMapper.toCalendarDate(stats.to),
      type: stats.type,
      periods: stats.periods,
    });
  }

  private static toCalendarDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
