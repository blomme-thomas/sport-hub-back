import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { EVENT_FORMATS } from '../../../domain/value-objects/event-format.vo.js';
import { GOAL_TYPES } from '../../../domain/value-objects/goal-type.vo.js';
import {
  IsCalendarDate,
  IsTargetTimeSeconds,
} from '../validators/goal.validators.js';

const isProvided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class UpdateGoalRequestDto {
  @ApiPropertyOptional({
    type: String,
    maxLength: 200,
    example: 'Triathlon de Lyon',
    description: 'Nouveau titre, absent = inchangé',
  })
  @ValidateIf(isProvided)
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    enum: GOAL_TYPES,
    example: 'evenement',
    description:
      'Nouveau type, absent = inchangé ; un format ou un temps cible restant posé refuse le passage à un autre type',
  })
  @ValidateIf(isProvided)
  @IsIn(GOAL_TYPES)
  type?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
    example: '2027-06-21',
    description:
      'Nouvelle date cible (YYYY-MM-DD), absent = inchangée, null = effacée',
  })
  @IsOptional()
  @IsCalendarDate
  targetDate?: string | null;

  @ApiPropertyOptional({
    enum: EVENT_FORMATS,
    nullable: true,
    example: 'half',
    description: 'Nouveau format, absent = inchangé, null = effacé',
  })
  @IsOptional()
  @IsIn(EVENT_FORMATS)
  eventFormat?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 21600,
    description:
      'Nouveau temps cible en secondes, absent = inchangé, null = effacé',
  })
  @IsOptional()
  @IsTargetTimeSeconds
  targetTimeSeconds?: number | null;
}
