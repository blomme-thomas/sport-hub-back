import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { EVENT_FORMATS } from '../../../domain/value-objects/event-format.vo.js';
import { GOAL_TYPES } from '../../../domain/value-objects/goal-type.vo.js';
import {
  IsCalendarDate,
  IsTargetTimeSeconds,
} from '../validators/goal.validators.js';

export class CreateGoalRequestDto {
  @ApiProperty({
    type: String,
    maxLength: 200,
    example: 'Triathlon de Nice',
    description: 'Titre de l’objectif, non vide après retrait des espaces',
  })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    enum: GOAL_TYPES,
    example: 'evenement',
    description: 'Événement, volume ou régularité',
  })
  @IsIn(GOAL_TYPES)
  type!: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
    example: '2027-06-20',
    description:
      'Date cible (YYYY-MM-DD), sans heure ; absente ou null = pas de date',
  })
  @IsOptional()
  @IsCalendarDate
  targetDate?: string | null;

  @ApiPropertyOptional({
    enum: EVENT_FORMATS,
    nullable: true,
    example: 'olympique',
    description: 'Format de l’événement, réservé au type evenement',
  })
  @IsOptional()
  @IsIn(EVENT_FORMATS)
  eventFormat?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 7200,
    description:
      'Temps cible en secondes (entier strictement positif), réservé au type evenement',
  })
  @IsOptional()
  @IsTargetTimeSeconds
  targetTimeSeconds?: number | null;
}
