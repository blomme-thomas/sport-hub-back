import { ApiProperty } from '@nestjs/swagger';
import { DisciplineResponseDto } from './discipline.response.dto.js';

export class DisciplineListResponseDto {
  @ApiProperty({
    type: [DisciplineResponseDto],
    description:
      'Disciplines triées par libellé croissant, puis par clé de type croissante',
  })
  items!: DisciplineResponseDto[];
}
