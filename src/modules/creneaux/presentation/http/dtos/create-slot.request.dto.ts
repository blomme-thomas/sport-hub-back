import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, ValidateIf } from 'class-validator';
import { SLOT_RECURRENCES } from '../../../domain/value-objects/slot-recurrence.vo.js';
import { SLOT_TYPES } from '../../../domain/value-objects/slot-type.vo.js';
import {
  IsCalendarDate,
  IsIanaTimeZone,
  IsSlotTime,
} from '../validators/slot.validators.js';

const isProvided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class CreateSlotRequestDto {
  @ApiProperty({
    enum: SLOT_TYPES,
    example: 'libre',
    description:
      'Libre (disponible) ou occupé (indisponible) ; les créneaux peuvent se chevaucher',
  })
  @IsIn(SLOT_TYPES)
  type!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-05-04',
    description:
      "Jour du créneau (YYYY-MM-DD) ; pour une récurrence hebdomadaire, jour d'ancrage de la série",
  })
  @IsCalendarDate
  date!: string;

  @ApiProperty({
    type: String,
    example: '09:00',
    description: 'Heure de début en heure murale locale (HH:mm)',
  })
  @IsSlotTime
  startTime!: string;

  @ApiProperty({
    type: String,
    example: '10:30',
    description:
      'Heure de fin en heure murale locale (HH:mm), strictement postérieure à startTime, 23:59 au plus',
  })
  @IsSlotTime
  endTime!: string;

  @ApiPropertyOptional({
    enum: SLOT_RECURRENCES,
    default: 'aucune',
    description:
      'Aucune (ponctuel, défaut) ou hebdomadaire (même heure chaque semaine, sans date de fin)',
  })
  @ValidateIf(isProvided)
  @IsIn(SLOT_RECURRENCES)
  recurrence?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Europe/Paris',
    default: 'Europe/Paris',
    description:
      'Fuseau IANA, métadonnée informative : les heures restent des heures murales',
  })
  @ValidateIf(isProvided)
  @IsIanaTimeZone
  timeZone?: string;
}
