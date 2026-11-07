import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateBy,
  type ValidationArguments,
} from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isNotBeforeFrom(value: unknown, args?: ValidationArguments): boolean {
  const from = (args?.object as { from?: unknown } | undefined)?.from;
  if (!isCalendarDate(value) || !isCalendarDate(from)) {
    return true;
  }
  return Date.parse(String(value)) >= Date.parse(String(from));
}

const IsCalendarDate = ValidateBy({
  name: 'isCalendarDate',
  validator: {
    validate: (value) => isCalendarDate(value),
    defaultMessage: () =>
      'doit être une date calendaire réelle au format YYYY-MM-DD',
  },
});

const IsNotBeforeFrom = ValidateBy({
  name: 'isNotBeforeFrom',
  validator: {
    validate: (value, args) => isNotBeforeFrom(value, args),
    defaultMessage: () => 'to doit être postérieur ou égal à from',
  },
});

export class GetTrainingStatsRequestDto {
  @ApiProperty({
    type: String,
    enum: ['week', 'month'],
    example: 'week',
    description:
      'Granularité des périodes : semaine ISO (lundi au dimanche, UTC) ou mois calendaire UTC',
  })
  @IsIn(['week', 'month'])
  granularity!: 'week' | 'month';

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-05-01',
    description:
      'Premier jour de la plage (YYYY-MM-DD, UTC) ; la période qui le contient est incluse',
  })
  @IsCalendarDate
  from!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-05-31',
    description:
      'Dernier jour de la plage (YYYY-MM-DD, UTC), postérieur ou égal à from ; la période qui le contient est incluse',
  })
  @IsCalendarDate
  @IsNotBeforeFrom
  to!: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 64,
    example: 'running',
    description:
      "Type d'activité, correspondance exacte (sensible à la casse), espaces en bordure ignorés ; absent = tous les types",
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  type?: string;
}
