import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsPositive,
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
  SESSION_CARBS_UNITS,
  type SessionCarbsUnit,
} from '../../../domain/value-objects/session-nutrition.vo.js';
import {
  SESSION_RECURRENCES,
  type SessionRecurrence,
} from '../../../domain/value-objects/session-recurrence.vo.js';
import { IsCalendarDate, SumsTo100 } from '../validators/session.validators.js';
import { SessionModuleRequestDto } from './session-module.request.dto.js';

export class CreateSessionRequestDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: 0.000001,
    example: 10000,
    description: 'Distance visée en mètres, facultative',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetDistanceMeters?: number;

  @ApiProperty({
    type: [Number],
    minItems: 5,
    maxItems: 5,
    example: [10, 20, 40, 20, 10],
    description:
      'Répartition cible du temps par zone de FC (Z1 à Z5), en pourcentages entiers qui totalisent 100',
  })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  @SumsTo100
  targetHrZonePercentages!: number[];

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 1000,
    example: 60,
    description: 'Cible de glucides en grammes, facultative ; exige carbsUnit',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  carbsGrams?: number;

  @ApiPropertyOptional({
    enum: SESSION_CARBS_UNITS,
    example: 'par_heure',
    description: 'Unité de la cible de glucides ; exige carbsGrams',
  })
  @IsOptional()
  @IsIn(SESSION_CARBS_UNITS)
  carbsUnit?: SessionCarbsUnit;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 20000,
    example: 500,
    description: 'Hydratation visée en millilitres pour la séance, facultative',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20000)
  hydrationMilliliters?: number;

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

  @ApiProperty({
    type: String,
    example: '18:00',
    description: 'Heure de début (HH:MM), obligatoire',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

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
    maxLength: 200,
    example: 'Fond en aisance',
    description: 'Titre de la séance, facultatif',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

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
