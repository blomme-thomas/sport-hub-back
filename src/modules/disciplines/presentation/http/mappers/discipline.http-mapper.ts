import type {
  DisciplineDto,
  RenameDisciplineCommand,
} from '../../../application/dtos/discipline.dto.js';
import type { DisciplineListResponseDto } from '../dtos/discipline-list.response.dto.js';
import type { DisciplineResponseDto } from '../dtos/discipline.response.dto.js';
import type { UpdateDisciplineRequestDto } from '../dtos/update-discipline.request.dto.js';

export class DisciplineHttpMapper {
  static toRenameCommand(
    typeKey: string,
    request: UpdateDisciplineRequestDto,
  ): RenameDisciplineCommand {
    return { typeKey, label: request.label };
  }

  static toResponse(dto: DisciplineDto): DisciplineResponseDto {
    return {
      typeKey: dto.typeKey,
      label: dto.label,
      firstSeenAt: dto.firstSeenAt,
      lastSeenAt: dto.lastSeenAt,
    };
  }

  static toListResponse(dtos: DisciplineDto[]): DisciplineListResponseDto {
    return { items: dtos.map((dto) => DisciplineHttpMapper.toResponse(dto)) };
  }
}
