import type {
  ChangeLogEntryDto,
  CreateSessionCommand,
  ListSessionsQuery,
  ReplaceSessionModulesCommand,
  SessionDto,
  SessionModuleDto,
  SessionOccurrenceDto,
  UpdateSessionCommand,
} from '../../../application/dtos/session.dto.js';
import type { CreateSessionRequestDto } from '../dtos/create-session.request.dto.js';
import type { ListSessionsRequestDto } from '../dtos/list-sessions.request.dto.js';
import type { ReplaceSessionModulesRequestDto } from '../dtos/replace-session-modules.request.dto.js';
import type { SessionOccurrenceListResponseDto } from '../dtos/session-list.response.dto.js';
import type {
  ChangeLogEntryResponseDto,
  SessionModuleResponseDto,
  SessionResponseDto,
} from '../dtos/session.response.dto.js';
import type { UpdateSessionRequestDto } from '../dtos/update-session.request.dto.js';

export class SessionHttpMapper {
  static toCreateCommand(
    request: CreateSessionRequestDto,
  ): CreateSessionCommand {
    return {
      date: request.date,
      disciplineTypeKey: request.disciplineTypeKey,
      durationMinutes: request.durationMinutes,
      startTime: request.startTime,
      recurrence: request.recurrence,
      description: request.description,
      equipment: request.equipment,
      attentionPoints: request.attentionPoints,
      modules: request.modules,
    };
  }

  static toUpdateCommand(
    id: string,
    request: UpdateSessionRequestDto,
  ): UpdateSessionCommand {
    return {
      id,
      date: request.date,
      disciplineTypeKey: request.disciplineTypeKey,
      durationMinutes: request.durationMinutes,
      startTime: request.startTime,
      recurrence: request.recurrence,
      status: request.status,
      description: request.description,
      equipment: request.equipment,
      attentionPoints: request.attentionPoints,
    };
  }

  static toReplaceModulesCommand(
    id: string,
    request: ReplaceSessionModulesRequestDto,
  ): ReplaceSessionModulesCommand {
    return { id, modules: request.modules };
  }

  static toListQuery(request: ListSessionsRequestDto): ListSessionsQuery {
    return { from: request.from, to: request.to };
  }

  static toResponse(dto: SessionDto): SessionResponseDto {
    return {
      id: dto.id,
      date: dto.date,
      disciplineTypeKey: dto.disciplineTypeKey,
      durationMinutes: dto.durationMinutes,
      startTime: dto.startTime,
      recurrence: dto.recurrence,
      status: dto.status,
      modifiedManually: dto.modifiedManually,
      description: dto.description,
      equipment: dto.equipment,
      attentionPoints: dto.attentionPoints,
      modules: dto.modules.map((module) =>
        SessionHttpMapper.toModuleResponse(module),
      ),
      changeLog: dto.changeLog.map((entry) =>
        SessionHttpMapper.toChangeLogResponse(entry),
      ),
      activity: dto.activity
        ? {
            id: dto.activity.id,
            origin: dto.activity.origin,
            linkedAt: dto.activity.linkedAt.toISOString(),
          }
        : null,
    };
  }

  static toOccurrenceListResponse(
    occurrences: SessionOccurrenceDto[],
  ): SessionOccurrenceListResponseDto {
    return {
      items: occurrences.map((occurrence) => ({
        sessionId: occurrence.sessionId,
        date: occurrence.date,
        startTime: occurrence.startTime,
        durationMinutes: occurrence.durationMinutes,
        disciplineTypeKey: occurrence.disciplineTypeKey,
        recurrence: occurrence.recurrence,
        status: occurrence.status,
      })),
    };
  }

  private static toModuleResponse(
    module: SessionModuleDto,
  ): SessionModuleResponseDto {
    return {
      position: module.position,
      type: module.type,
      durationMinutes: module.durationMinutes,
      instruction: module.instruction,
      targetZones: module.targetZones,
      perceivedEffort: module.perceivedEffort,
    };
  }

  private static toChangeLogResponse(
    entry: ChangeLogEntryDto,
  ): ChangeLogEntryResponseDto {
    return {
      changedAt: entry.changedAt.toISOString(),
      field: entry.field,
      previousValue: entry.previousValue,
    };
  }
}
