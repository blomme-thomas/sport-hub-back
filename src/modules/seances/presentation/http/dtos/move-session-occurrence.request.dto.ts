import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Matches, ValidateIf } from 'class-validator';
import { IsCalendarDate } from '../validators/session.validators.js';

const isTextProvided = (_object: object, value: unknown): boolean =>
  value !== undefined && value !== null;

export class MoveSessionOccurrenceRequestDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-17',
    description: 'Nouvelle date de l’occurrence (YYYY-MM-DD)',
  })
  @IsCalendarDate
  date!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '07:00',
    description:
      'Nouvelle heure de début (HH:MM) ; absente = heure de la série conservée, null = pas d’heure',
  })
  @ValidateIf(isTextProvided)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string | null;
}
