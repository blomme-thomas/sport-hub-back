import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GetTrainingStatsUseCase } from '../../../application/use-cases/get-training-stats.use-case.js';
import { GetTrainingStatsRequestDto } from '../dtos/get-training-stats.request.dto.js';
import { TrainingStatsResponseDto } from '../dtos/training-stats.response.dto.js';
import { TrainingStatsHttpMapper } from '../mappers/training-stats.http-mapper.js';

@ApiTags('training-stats')
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
    const stats = await this.getTrainingStats.execute(
      TrainingStatsHttpMapper.toQuery(request),
    );
    return TrainingStatsHttpMapper.toResponse(stats);
  }
}
