import type { ActivityListDto } from '../../../application/dtos/activity-list.dto.js';
import type { ListActivitiesRequestDto } from '../dtos/list-activities.request.dto.js';
import {
  ActivityListResponseDto,
  ActivitySummaryResponseDto,
} from '../dtos/activity-list.response.dto.js';

export class ActivitiesHttpMapper {
  static toQuery(request: ListActivitiesRequestDto) {
    return {
      page: request.page,
      pageSize: request.pageSize,
      from: request.from !== undefined ? new Date(request.from) : undefined,
      to: request.to !== undefined ? new Date(request.to) : undefined,
      type: request.type,
    };
  }

  static toResponse(page: ActivityListDto): ActivityListResponseDto {
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
