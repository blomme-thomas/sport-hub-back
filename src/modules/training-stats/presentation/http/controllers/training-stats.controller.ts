import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GetDashboardStatsUseCase } from '../../../application/use-cases/get-dashboard-stats.use-case.js';
import { GetTrainingStatsUseCase } from '../../../application/use-cases/get-training-stats.use-case.js';
import { GetDashboardStatsRequestDto } from '../dtos/get-dashboard-stats.request.dto.js';
import { DashboardStatsResponseDto } from '../dtos/dashboard-stats.response.dto.js';
import { GetTrainingStatsRequestDto } from '../dtos/get-training-stats.request.dto.js';
import { TrainingStatsResponseDto } from '../dtos/training-stats.response.dto.js';
import { DashboardStatsHttpMapper } from '../mappers/dashboard-stats.http-mapper.js';
import { TrainingStatsHttpMapper } from '../mappers/training-stats.http-mapper.js';

@ApiTags('training-stats')
@Controller('stats')
export class TrainingStatsController {
  constructor(
    private readonly getTrainingStats: GetTrainingStatsUseCase,
    private readonly getDashboardStats: GetDashboardStatsUseCase,
  ) {}

  @Get('dashboard')
  @ApiProblemResponses(400)
  @ApiOperation({
    summary:
      'Indicateurs agrégés du tableau de bord pour une période glissante (7 j, 30 j, 3 mois, 1 an) : totaux, FC moyenne, zones cardiaques, répartition par sport, série journalière et variation',
  })
  @ApiOkResponse({
    type: DashboardStatsResponseDto,
    description:
      'Indicateurs de la période, avec la variation de la durée par rapport à la période précédente de même durée',
  })
  async getDashboard(
    @Query() request: GetDashboardStatsRequestDto,
  ): Promise<DashboardStatsResponseDto> {
    const result = await this.getDashboardStats.execute(request.period);
    return DashboardStatsHttpMapper.toResponse(result);
  }

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
    const stats = await this.getTrainingStats.execute(
      TrainingStatsHttpMapper.toQuery(request),
    );
    return TrainingStatsHttpMapper.toResponse(stats);
  }
}
