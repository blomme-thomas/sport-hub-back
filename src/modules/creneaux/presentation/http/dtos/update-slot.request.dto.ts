import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateSlotRequestDto {
  @ApiPropertyOptional({
    enum: SLOT_TYPES,
    example: 'occupe',
    description: 'Nouveau type, absent = inchangé',
  })
  @ValidateIf(isProvided)
  @IsIn(SLOT_TYPES)
  type?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-05-05',
    description: 'Nouveau jour (YYYY-MM-DD), absent = inchangé',
  })
  @ValidateIf(isProvided)
  @IsCalendarDate
  date?: string;

  @ApiPropertyOptional({
    type: String,
    example: '09:30',
    description: 'Nouvelle heure de début (HH:mm), absent = inchangée',
  })
  @ValidateIf(isProvided)
  @IsSlotTime
  startTime?: string;

  @ApiPropertyOptional({
    type: String,
    example: '11:00',
    description:
      'Nouvelle heure de fin (HH:mm), absent = inchangée ; la fusion avec le début doit rester valide',
  })
  @ValidateIf(isProvided)
  @IsSlotTime
  endTime?: string;

  @ApiPropertyOptional({
    enum: SLOT_RECURRENCES,
    description:
      'Nouvelle récurrence, absent = inchangée ; la modification vaut pour toute la série',
  })
  @ValidateIf(isProvided)
  @IsIn(SLOT_RECURRENCES)
  recurrence?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Europe/Paris',
    description: 'Nouveau fuseau IANA, absent = inchangé',
  })
  @ValidateIf(isProvided)
  @IsIanaTimeZone
  timeZone?: string;
}
