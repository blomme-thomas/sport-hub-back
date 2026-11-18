import { sportFamilyOf } from '../../../../../shared/domain/value-objects/sport-family.vo.js';
import type { ActivityListDto } from '../../../application/dtos/activity-list.dto.js';
import type { ListActivitiesRequestDto } from '../dtos/list-activities.request.dto.js';
import {
  ActivityListResponseDto,
  ActivitySummaryResponseDto,
} from '../dtos/activity-list.response.dto.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Une date seule (YYYY-MM-DD) désigne le jour entier : la borne haute couvre jusqu'à la fin de ce jour (UTC). */
function toUpperBound(value: string): Date {
  return DATE_ONLY.test(value)
    ? new Date(`${value}T23:59:59.999Z`)
    : new Date(value);
}

export class ActivitiesHttpMapper {
  static toQuery(request: ListActivitiesRequestDto) {
    return {
      page: request.page,
      pageSize: request.pageSize,
      from: request.from !== undefined ? new Date(request.from) : undefined,
      to: request.to !== undefined ? toUpperBound(request.to) : undefined,
      type: request.type,
    };
  }

  static toResponse(page: ActivityListDto): ActivityListResponseDto {
    return Object.assign(new ActivityListResponseDto(), {
      items: page.items.map((item) =>
        Object.assign(new ActivitySummaryResponseDto(), {
          ...item,
          family: sportFamilyOf(item.type),
        }),
      ),
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
    });
  }
}
