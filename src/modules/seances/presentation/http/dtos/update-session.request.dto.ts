import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsPositive,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  SESSION_CARBS_UNITS,
  type SessionCarbsUnit,
} from '../../../domain/value-objects/session-nutrition.vo.js';
import {
  SESSION_RECURRENCES,
  type SessionRecurrence,
} from '../../../domain/value-objects/session-recurrence.vo.js';
import { SESSION_STATUSES } from '../../../domain/value-objects/session-status.vo.js';
import { IsCalendarDate, SumsTo100 } from '../validators/session.validators.js';

const isProvided = (_object: object, value: unknown): boolean =>
  value !== undefined;

const isTextProvided = (_object: object, value: unknown): boolean =>
  value !== undefined && value !== null;

export class UpdateSessionRequestDto {
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0.000001,
    example: 10000,
    description: 'Nouvelle distance visée, absent = inchangée, null = effacée',
  })
  @ValidateIf(isTextProvided)
  @IsNumber()
  @IsPositive()
  targetDistanceMeters?: number | null;

  @ApiPropertyOptional({
    type: [Number],
    minItems: 5,
    maxItems: 5,
    example: [10, 20, 40, 20, 10],
    description: 'Nouvelle répartition par zone, absent = inchangée',
  })
  @ValidateIf(isProvided)
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  @SumsTo100
  targetHrZonePercentages?: number[];

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 1000,
    example: 60,
    description:
      'Nouvelle cible de glucides en grammes, absent = inchangée, null = effacée (avec carbsUnit)',
  })
  @ValidateIf(isTextProvided)
  @IsInt()
  @Min(1)
  @Max(1000)
  carbsGrams?: number | null;

  @ApiPropertyOptional({
    enum: SESSION_CARBS_UNITS,
    nullable: true,
    example: 'par_heure',
    description:
      'Nouvelle unité de glucides, absent = inchangée, null = effacée (avec carbsGrams)',
  })
  @ValidateIf(isTextProvided)
  @IsIn(SESSION_CARBS_UNITS)
  carbsUnit?: SessionCarbsUnit | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 20000,
    example: 500,
    description:
      'Nouvelle hydratation en millilitres, absent = inchangée, null = effacée',
  })
  @ValidateIf(isTextProvided)
  @IsInt()
  @Min(1)
  @Max(20000)
  hydrationMilliliters?: number | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-05-05',
    description: 'Nouvelle date (YYYY-MM-DD), absent = inchangée',
  })
  @ValidateIf(isProvided)
  @IsCalendarDate
  date?: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 100,
    example: 'running',
    description: 'Nouvelle discipline du référentiel, absent = inchangée',
  })
  @ValidateIf(isProvided)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  disciplineTypeKey?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 1440,
    example: 45,
    description: 'Nouvelle durée totale en minutes, absent = inchangée',
  })
  @ValidateIf(isProvided)
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @ApiPropertyOptional({
    type: String,
    example: '18:00',
    description:
      'Heure de début (HH:MM) ; absente = inchangée, null refusé (une heure est obligatoire)',
  })
  @ValidateIf(isProvided)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;

  @ApiPropertyOptional({
    enum: SESSION_RECURRENCES,
    example: 'hebdomadaire',
    description:
      'Nouvelle récurrence, absent = inchangée ; s’applique à toute la série',
  })
  @ValidateIf(isProvided)
  @IsIn(SESSION_RECURRENCES)
  recurrence?: SessionRecurrence;

  @ApiPropertyOptional({
    enum: SESSION_STATUSES,
    example: 'manquee',
    description: 'Nouveau statut, absent = inchangé',
  })
  @ValidateIf(isProvided)
  @IsIn(SESSION_STATUSES)
  status?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 200,
    example: 'Fond en aisance',
    description: 'Nouveau titre, absent = inchangé, null = effacé',
  })
  @ValidateIf(isTextProvided)
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 2000,
    example: 'Seuil',
    description: 'Nouvelle description, absent = inchangée, null = effacée',
  })
  @ValidateIf(isTextProvided)
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
