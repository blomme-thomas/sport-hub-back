import type { SessionImportTemplateDto } from '../../../application/dtos/session-import-template.dto.js';
import type { SessionImportTemplateResponseDto } from '../dtos/session-import-template.response.dto.js';

export class SessionImportHttpMapper {
  static toTemplateResponse(
    dto: SessionImportTemplateDto,
  ): SessionImportTemplateResponseDto {
    return dto;
  }
}
