import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ExportCalendarQueryDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-09',
    description: 'Premier jour de la période (AAAA-MM-JJ, inclus)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-15',
    description: 'Dernier jour de la période (AAAA-MM-JJ, inclus)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;
}
