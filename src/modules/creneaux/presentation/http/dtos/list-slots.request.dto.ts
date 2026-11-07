import { ApiProperty } from '@nestjs/swagger';
import { IsCalendarDate } from '../validators/slot.validators.js';

export class ListSlotsRequestDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-05-01',
    description:
      'Premier jour de la période (YYYY-MM-DD, inclus). La période compte au plus 366 jours',
  })
  @IsCalendarDate
  from!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-05-31',
    description:
      'Dernier jour de la période (YYYY-MM-DD, inclus), postérieur ou égal à from',
  })
  @IsCalendarDate
  to!: string;
}
