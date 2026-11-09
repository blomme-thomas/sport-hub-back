import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  SESSION_RECURRENCES,
  type SessionRecurrence,
} from '../../../domain/value-objects/session-recurrence.vo.js';
import { IsCalendarDate } from '../validators/session.validators.js';
import { SessionModuleRequestDto } from './session-module.request.dto.js';

export class CreateSessionRequestDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-05-04',
    description: 'Jour de la séance (YYYY-MM-DD)',
  })
  @IsCalendarDate
  date!: string;

  @ApiProperty({
    type: String,
    example: 'swimming',
    maxLength: 100,
    description: 'Clé de type d’une discipline du référentiel',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  disciplineTypeKey!: string;

  @ApiProperty({
    type: Number,
    example: 60,
    minimum: 1,
    maximum: 1440,
    description: 'Durée totale prévue en minutes',
  })
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '18:00',
    description: 'Heure de début (HH:MM), facultative',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string | null;

  @ApiPropertyOptional({
    enum: SESSION_RECURRENCES,
    example: 'hebdomadaire',
    description: 'Récurrence de la séance, aucune par défaut',
  })
  @IsOptional()
  @IsIn(SESSION_RECURRENCES)
  recurrence?: SessionRecurrence;

  @ApiPropertyOptional({
    type: String,
    maxLength: 2000,
    example: 'Séance de fond',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 1000,
    example: 'Palmes, plaquettes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  equipment?: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 1000,
    example: 'Épaule droite',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  attentionPoints?: string;

  @ApiPropertyOptional({
    type: [SessionModuleRequestDto],
    maxItems: 30,
    description:
      'Modules ordonnés ; leur ordre dans la liste fixe leur position',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SessionModuleRequestDto)
  modules?: SessionModuleRequestDto[];
}
