import type {
  ImportSessionsCommand,
  ImportSessionsResultDto,
} from '../../../application/dtos/session-import.dto.js';
import type { SessionImportTemplateDto } from '../../../application/dtos/session-import-template.dto.js';
import type { ImportSessionsRequestDto } from '../dtos/import-sessions.request.dto.js';
import type { ImportSessionsResponseDto } from '../dtos/import-sessions.response.dto.js';
import type { SessionImportTemplateResponseDto } from '../dtos/session-import-template.response.dto.js';

export class SessionImportHttpMapper {
  static toTemplateResponse(
    dto: SessionImportTemplateDto,
  ): SessionImportTemplateResponseDto {
    return dto;
  }

  static toImportCommand(
    request: ImportSessionsRequestDto,
  ): ImportSessionsCommand {
    return {
      kind: request.kind,
      schemaVersion: request.schemaVersion,
      importId: request.importId,
      seances: request.seances,
    };
  }

  static toImportResponse(
    dto: ImportSessionsResultDto,
  ): ImportSessionsResponseDto {
    return {
      importId: dto.importId,
      createdCount: dto.createdCount,
      sessionIds: dto.sessionIds,
    };
  }
}
