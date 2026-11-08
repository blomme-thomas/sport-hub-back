import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { PAUSE_REASONS } from '../../../domain/value-objects/pause-reason.vo.js';

export class CreatePauseRequestDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-12-20',
    description: 'Premier jour de la pause (AAAA-MM-JJ, inclus)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2027-01-05',
    description:
      'Dernier jour de la pause (AAAA-MM-JJ, inclus), égal ou postérieur au début',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;

  @ApiProperty({
    enum: PAUSE_REASONS,
    example: 'vacances',
    description: 'Motif de la pause',
  })
  @IsString()
  reason!: string;
}
