import { ApiPropertyOptional } from '@nestjs/swagger';
import {
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
import { SESSION_STATUSES } from '../../../domain/value-objects/session-status.vo.js';
import { IsCalendarDate } from '../validators/session.validators.js';

const isProvided = (_object: object, value: unknown): boolean =>
  value !== undefined;

const isTextProvided = (_object: object, value: unknown): boolean =>
  value !== undefined && value !== null;

export class UpdateSessionRequestDto {
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
    nullable: true,
    example: '18:00',
    description:
      'Heure de début (HH:MM) ; null efface l’heure, absent = inchangée',
  })
  @ValidateIf(isTextProvided)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string | null;

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
    maxLength: 2000,
    example: 'Seuil',
    description: 'Nouvelle description, absent = inchangée, null = effacée',
  })
  @ValidateIf(isTextProvided)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 1000,
    example: 'Palmes',
    description: 'Nouveau matériel, absent = inchangé, null = effacé',
  })
  @ValidateIf(isTextProvided)
  @IsString()
  @MaxLength(1000)
  equipment?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 1000,
    example: 'Épaule droite',
    description:
      'Nouveaux points d’attention, absent = inchangés, null = effacés',
  })
  @ValidateIf(isTextProvided)
  @IsString()
  @MaxLength(1000)
  attentionPoints?: string | null;
}
