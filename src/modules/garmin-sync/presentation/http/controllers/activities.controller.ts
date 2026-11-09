import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GetActivityDetailUseCase } from '../../../application/use-cases/get-activity-detail.use-case.js';
import { ListActivitiesUseCase } from '../../../application/use-cases/list-activities.use-case.js';
import { ActivityDetailResponseDto } from '../dtos/activity-detail.response.dto.js';
import { ActivityIdParamDto } from '../dtos/activity-id.param.dto.js';
import { ActivityListResponseDto } from '../dtos/activity-list.response.dto.js';
import { ListActivitiesRequestDto } from '../dtos/list-activities.request.dto.js';
import { ActivitiesHttpMapper } from '../mappers/activities.http-mapper.js';

@ApiTags('garmin-sync')
@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly listActivities: ListActivitiesUseCase,
    private readonly getActivityDetail: GetActivityDetailUseCase,
  ) {}

  @Get()
  @ApiProblemResponses(400)
  @ApiOperation({
    summary:
      'Liste paginée des activités synchronisées, de la plus récente à la plus ancienne',
  })
  @ApiOkResponse({
    type: ActivityListResponseDto,
    description: 'Une page des activités et le total correspondant aux filtres',
  })
  async list(
    @Query() request: ListActivitiesRequestDto,
  ): Promise<ActivityListResponseDto> {
    const page = await this.listActivities.execute(
      ActivitiesHttpMapper.toQuery(request),
    );
    return ActivitiesHttpMapper.toResponse(page);
  }

  @Get(':id')
  @ApiProblemResponses(400, 404)
  @ApiOperation({
    summary:
      "Détail d'une activité synchronisée : métriques, FC moyenne et maximale, zones cardiaques (lu en base, sans appel à Garmin)",
  })
  @ApiOkResponse({ type: ActivityDetailResponseDto })
  async detail(
    @Param() params: ActivityIdParamDto,
  ): Promise<ActivityDetailResponseDto> {
    return this.getActivityDetail.execute(params.id);
  }
}
