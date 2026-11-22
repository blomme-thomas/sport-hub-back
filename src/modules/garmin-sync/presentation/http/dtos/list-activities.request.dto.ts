import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateBy,
  type ValidationArguments,
} from 'class-validator';

function isParsableDate(value: unknown): boolean {
  if (typeof value !== 'string') {
    return true;
  }
  return !Number.isNaN(Date.parse(value));
}

function isNotBeforeFrom(value: unknown, args?: ValidationArguments): boolean {
  const from = (args?.object as { from?: unknown } | undefined)?.from;
  if (typeof value !== 'string' || typeof from !== 'string') {
    return true;
  }
  const to = Date.parse(value);
  const start = Date.parse(from);
  if (Number.isNaN(to) || Number.isNaN(start)) {
    return true;
  }
  return to >= start;
}

const IsParsableDate = ValidateBy({
  name: 'isParsableDate',
  validator: {
    validate: (value) => isParsableDate(value),
    defaultMessage: () => 'doit être une date ISO 8601 calendaire valide',
  },
});

export class ListActivitiesRequestDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 1000000,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page: number = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Date de début minimale (incluse), au format ISO 8601',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  @IsParsableDate
  from?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description:
      'Date de début maximale (incluse), au format ISO 8601, postérieure ou égale à from',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  @IsParsableDate
  @ValidateBy({
    name: 'isNotBeforeFrom',
    validator: {
      validate: (value, args) => isNotBeforeFrom(value, args),
      defaultMessage: () => 'to doit être postérieur ou égal à from',
    },
  })
  to?: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 64,
    example: 'running',
    description:
      "Type d'activité, correspondance exacte (sensible à la casse), espaces en bordure ignorés",
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
