import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import type { ActivityListDto } from '../../../application/dtos/activity-list.dto.js';
import { ListActivitiesUseCase } from '../../../application/use-cases/list-activities.use-case.js';
import { ListActivitiesRequestDto } from '../dtos/list-activities.request.dto.js';
import {
  ActivityListResponseDto,
  ActivitySummaryResponseDto,
} from '../dtos/activity-list.response.dto.js';

@ApiTags('activities')
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
    const page = await this.listActivities.execute({
      page: request.page,
      pageSize: request.pageSize,
      from: request.from !== undefined ? new Date(request.from) : undefined,
      to: request.to !== undefined ? new Date(request.to) : undefined,
      type: request.type,
    });
    return ActivitiesController.toResponse(page);
  }

  private static toResponse(page: ActivityListDto): ActivityListResponseDto {
    return Object.assign(new ActivityListResponseDto(), {
      items: page.items.map((item) =>
        Object.assign(new ActivitySummaryResponseDto(), item),
      ),
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
    });
  }
}
