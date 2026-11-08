import { ApiProperty } from '@nestjs/swagger';
import type { PauseDto } from '../../../application/dtos/pause.dto.js';

export class PauseResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-12-20' })
  startDate!: string;

  @ApiProperty({ type: String, format: 'date', example: '2027-01-05' })
  endDate!: string;

  @ApiProperty({
    type: String,
    enum: ['blessure', 'vacances', 'autre'],
    example: 'vacances',
  })
  reason!: string;

  static fromDto(dto: PauseDto): PauseResponseDto {
    return {
      id: dto.id,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
    };
  }
}
