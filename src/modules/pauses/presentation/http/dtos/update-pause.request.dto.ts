import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PAUSE_REASONS } from '../../../domain/value-objects/pause-reason.vo.js';

export class UpdatePauseRequestDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-12-22',
    description: 'Nouveau premier jour (AAAA-MM-JJ) ; absent = inchangé',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2027-01-06',
    description: 'Nouveau dernier jour (AAAA-MM-JJ) ; absent = inchangé',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @ApiPropertyOptional({
    enum: PAUSE_REASONS,
    example: 'blessure',
    description: 'Nouveau motif ; absent = inchangé',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
