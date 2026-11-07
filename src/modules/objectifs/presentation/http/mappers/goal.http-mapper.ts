import type {
  CreateGoalCommand,
  GoalDto,
  ListGoalsQuery,
  UpdateGoalCommand,
} from '../../../application/dtos/goal.dto.js';
import type { CreateGoalRequestDto } from '../dtos/create-goal.request.dto.js';
import type { GoalListResponseDto } from '../dtos/goal-list.response.dto.js';
import type { GoalResponseDto } from '../dtos/goal.response.dto.js';
import type { ListGoalsRequestDto } from '../dtos/list-goals.request.dto.js';
import type { UpdateGoalRequestDto } from '../dtos/update-goal.request.dto.js';

export class GoalHttpMapper {
  static toCreateCommand(request: CreateGoalRequestDto): CreateGoalCommand {
    return {
      title: request.title,
      type: request.type,
      targetDate: request.targetDate,
      eventFormat: request.eventFormat,
      targetTimeSeconds: request.targetTimeSeconds,
    };
  }

  static toUpdateCommand(
    id: string,
    request: UpdateGoalRequestDto,
  ): UpdateGoalCommand {
    return {
      id,
      title: request.title,
      type: request.type,
      targetDate: request.targetDate,
      eventFormat: request.eventFormat,
      targetTimeSeconds: request.targetTimeSeconds,
    };
  }

  static toListQuery(request: ListGoalsRequestDto): ListGoalsQuery {
    return { upcoming: request.upcoming };
  }

  static toResponse(dto: GoalDto): GoalResponseDto {
    return {
      id: dto.id,
      title: dto.title,
      type: dto.type,
      targetDate: dto.targetDate,
      eventFormat: dto.eventFormat,
      targetTimeSeconds: dto.targetTimeSeconds,
    };
  }

  static toListResponse(dtos: GoalDto[]): GoalListResponseDto {
    return { items: dtos.map((dto) => GoalHttpMapper.toResponse(dto)) };
  }
}
