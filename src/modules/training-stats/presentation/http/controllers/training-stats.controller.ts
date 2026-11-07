import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import type { TrainingStatsDto } from '../../../application/dtos/training-stats.dto.js';
import { GetTrainingStatsUseCase } from '../../../application/use-cases/get-training-stats.use-case.js';
import { GetTrainingStatsRequestDto } from '../dtos/get-training-stats.request.dto.js';
import { TrainingStatsResponseDto } from '../dtos/training-stats.response.dto.js';

@ApiTags('stats')
@Controller('stats')
export class TrainingStatsController {
  constructor(private readonly getTrainingStats: GetTrainingStatsUseCase) {}

  @Get()
  @ApiProblemResponses(400)
  @ApiOperation({
    summary:
      "Statistiques de volume d'entraînement (séances, durée, distance) par semaine ou par mois, avec comparaison à la période précédente",
  })
  @ApiOkResponse({
    type: TrainingStatsResponseDto,
    description:
      'Périodes complètes de la plage, avec totaux, ventilation par type, période précédente et variation',
  })
  async get(
    @Query() request: GetTrainingStatsRequestDto,
  ): Promise<TrainingStatsResponseDto> {
    const stats = await this.getTrainingStats.execute({
      granularity: request.granularity,
      from: new Date(`${request.from}T00:00:00.000Z`),
      to: new Date(`${request.to}T00:00:00.000Z`),
      type: request.type ?? null,
    });
    return TrainingStatsController.toResponse(stats);
  }

  private static toResponse(stats: TrainingStatsDto): TrainingStatsResponseDto {
    return Object.assign(new TrainingStatsResponseDto(), {
      granularity: stats.granularity,
      from: TrainingStatsController.toCalendarDate(stats.from),
      to: TrainingStatsController.toCalendarDate(stats.to),
      type: stats.type,
      periods: stats.periods,
    });
  }

  private static toCalendarDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
