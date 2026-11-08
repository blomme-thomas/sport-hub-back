import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class WeeklyReviewParamDto {
  @ApiProperty({ type: String, example: '2026-W45' })
  @Matches(/^\d{4}-W\d{2}$/)
  week!: string;
}
