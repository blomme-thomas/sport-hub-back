import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { ListActivitiesUseCase } from '../../../application/use-cases/list-activities.use-case.js';
import { ActivityListResponseDto } from '../dtos/activity-list.response.dto.js';
import { ListActivitiesRequestDto } from '../dtos/list-activities.request.dto.js';
import { ActivitiesHttpMapper } from '../mappers/activities.http-mapper.js';

@ApiTags('garmin-sync')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly listActivities: ListActivitiesUseCase) {}

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
}
