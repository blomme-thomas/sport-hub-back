import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MODULE_TYPES } from '../../../domain/value-objects/module-type.vo.js';

export class ZoneRangeRequestDto {
  @ApiProperty({ type: Number, example: 140, minimum: 1 })
  @IsInt()
  @Min(1)
  min!: number;

  @ApiProperty({ type: Number, example: 160, minimum: 1 })
  @IsInt()
  @Min(1)
  max!: number;
}

export class TargetZonesRequestDto {
  @ApiPropertyOptional({ type: ZoneRangeRequestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ZoneRangeRequestDto)
  heartRate?: ZoneRangeRequestDto;

  @ApiPropertyOptional({
    type: ZoneRangeRequestDto,
    description: 'Allure cible en secondes par kilomètre',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ZoneRangeRequestDto)
  pace?: ZoneRangeRequestDto;

  @ApiPropertyOptional({ type: ZoneRangeRequestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ZoneRangeRequestDto)
  power?: ZoneRangeRequestDto;
}

export class SessionModuleRequestDto {
  @ApiProperty({
    enum: MODULE_TYPES,
    example: 'series',
    description:
      'Type du module : échauffement, éducatifs, séries, retour au calme ou autre',
  })
  @IsIn(MODULE_TYPES)
  type!: string;

  @ApiProperty({
    type: Number,
    example: 20,
    minimum: 1,
    maximum: 1440,
    description: 'Durée du module en minutes',
  })
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number;

  @ApiProperty({
    type: String,
    maxLength: 2000,
    example: '4 x 100 m',
    description: 'Consigne du module',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  instruction!: string;

  @ApiPropertyOptional({
    type: TargetZonesRequestDto,
    nullable: true,
    description: 'Zones cibles : fréquence cardiaque, allure ou puissance',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetZonesRequestDto)
  targetZones?: TargetZonesRequestDto | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 10,
    example: 7,
    description: 'Effort perçu visé, de 1 (très facile) à 10 (maximal)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  perceivedEffort?: number | null;
}
