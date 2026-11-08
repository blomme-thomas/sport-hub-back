import { ApiProperty } from '@nestjs/swagger';
import { SESSION_STATUSES } from '../../../domain/value-objects/session-status.vo.js';
import { MODULE_TYPES } from '../../../domain/value-objects/module-type.vo.js';

export class ZoneRangeResponseDto {
  @ApiProperty({ type: Number, example: 140 })
  min!: number;

  @ApiProperty({ type: Number, example: 160 })
  max!: number;
}

export class TargetZonesResponseDto {
  @ApiProperty({ type: ZoneRangeResponseDto, required: false })
  heartRate?: ZoneRangeResponseDto;

  @ApiProperty({ type: ZoneRangeResponseDto, required: false })
  pace?: ZoneRangeResponseDto;

  @ApiProperty({ type: ZoneRangeResponseDto, required: false })
  power?: ZoneRangeResponseDto;
}

export class SessionModuleResponseDto {
  @ApiProperty({ type: Number, example: 1, minimum: 1 })
  position!: number;

  @ApiProperty({ enum: MODULE_TYPES, example: 'echauffement' })
  type!: string;

  @ApiProperty({ type: Number, example: 10 })
  durationMinutes!: number;

  @ApiProperty({ type: String, example: 'Nage souple' })
  instruction!: string;

  @ApiProperty({ type: TargetZonesResponseDto, nullable: true })
  targetZones!: TargetZonesResponseDto | null;

  @ApiProperty({ type: Number, nullable: true, example: 3 })
  perceivedEffort!: number | null;
}

export class ChangeLogEntryResponseDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-08T10:00:00.000Z',
  })
  changedAt!: string;

  @ApiProperty({ type: String, example: 'durationMinutes' })
  field!: string;

  @ApiProperty({ type: String, nullable: true, example: '60' })
  previousValue!: string | null;
}

export class SessionResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
  })
  id!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-05-04' })
  date!: string;

  @ApiProperty({ type: String, example: 'swimming' })
  disciplineTypeKey!: string;

  @ApiProperty({ type: Number, example: 60 })
  durationMinutes!: number;

  @ApiProperty({ enum: SESSION_STATUSES, example: 'planifiee' })
  status!: string;

  @ApiProperty({
    type: Boolean,
    example: false,
    description: 'Vrai dès qu’une modification manuelle a été faite',
  })
  modifiedManually!: boolean;

  @ApiProperty({ type: String, nullable: true, example: 'Séance de fond' })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Palmes' })
  equipment!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Épaule droite' })
  attentionPoints!: string | null;

  @ApiProperty({
    type: [SessionModuleResponseDto],
    description: 'Modules triés par position croissante',
  })
  modules!: SessionModuleResponseDto[];

  @ApiProperty({
    type: [ChangeLogEntryResponseDto],
    description: 'Journal des modifications manuelles, par ordre chronologique',
  })
  changeLog!: ChangeLogEntryResponseDto[];
}
