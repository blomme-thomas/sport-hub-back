import type { AlimentsImportResultDto } from '../../../application/dtos/aliments-import.dto.js';
import type { AlimentsImportResponseDto } from '../dtos/aliments-import.response.dto.js';

export class AlimentsImportHttpMapper {
  static toResponse(dto: AlimentsImportResultDto): AlimentsImportResponseDto {
    return { createdCount: dto.createdCount, ids: dto.ids };
  }
}
