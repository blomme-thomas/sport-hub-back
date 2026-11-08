import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class GeneratePlanningRequestDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-09',
    description:
      'Premier jour du planning (YYYY-MM-DD). Les jours passés sont écartés.',
  })
  @Matches(CALENDAR_DATE)
  from!: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-11-15',
    description:
      'Dernier jour du planning (YYYY-MM-DD). Obligatoire sans objectif ; ignoré si goalId est fourni.',
  })
  @IsOptional()
  @Matches(CALENDAR_DATE)
  to?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Objectif dont la date cible sert de dernier jour du planning',
  })
  @IsOptional()
  @IsUUID()
  goalId?: string;
}
