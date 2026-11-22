import { ApiProperty } from '@nestjs/swagger';
import { ValidateBy, type ValidationArguments } from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const IsCalendarDate = ValidateBy({
  name: 'isCalendarDate',
  validator: {
    validate: (value) => isCalendarDate(value),
    defaultMessage: () =>
      'doit être une date calendaire réelle au format YYYY-MM-DD',
  },
});

const IsRecoveryRangeValid = ValidateBy({
  name: 'isRecoveryRangeValid',
  validator: {
    validate: (value: unknown, args?: ValidationArguments) => {
      const from = (args?.object as { from?: unknown } | undefined)?.from;
      if (!isCalendarDate(value) || !isCalendarDate(from)) {
        return true;
      }
      const days =
        (Date.parse(`${value}T00:00:00.000Z`) -
          Date.parse(`${from}T00:00:00.000Z`)) /
          DAY_MS +
        1;
      return days >= 1 && days <= MAX_DAYS;
    },
    defaultMessage: () =>
      `to doit être postérieur ou égal à from, et la plage ne doit pas dépasser ${MAX_DAYS} jours`,
  },
});

export class GetRecoveryRequestDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-01',
    description: 'Premier jour de la plage (YYYY-MM-DD, inclus)',
  })
  @IsCalendarDate
  from!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-07',
    description: `Dernier jour de la plage (YYYY-MM-DD, inclus). La plage fait ${MAX_DAYS} jours au plus.`,
  })
  @IsCalendarDate
  @IsRecoveryRangeValid
  to!: string;
}
