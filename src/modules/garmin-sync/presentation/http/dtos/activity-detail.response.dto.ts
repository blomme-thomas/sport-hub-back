import { ApiProperty } from '@nestjs/swagger';

export class ActivityDetailResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, example: '12345678901' })
  garminActivityId!: string;

  @ApiProperty({ type: String, example: 'running' })
  type!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startedAt!: Date;

  @ApiProperty({ type: Number, example: 3600.5 })
  durationSeconds!: number;

  @ApiProperty({ type: Number, nullable: true, example: 10250.75 })
  distanceMeters!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 650 })
  calories!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 120 })
  elevationGainMeters!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 145,
    description: 'FC moyenne, null si Garmin ne la fournit pas',
  })
  averageHeartRate!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 172,
    description: 'FC maximale, null si Garmin ne la fournit pas',
  })
  maxHeartRate!: number | null;

  @ApiProperty({
    type: [Number],
    nullable: true,
    minItems: 5,
    maxItems: 5,
    example: [600, 1200, 1500, 300, null],
    description:
      'Temps passé dans les zones 1 à 5 (unité supposée en secondes, non confirmée par la spécification Garmin) ; null pour une zone non renseignée',
  })
  hrTimeInZone!: (number | null)[];

  @ApiProperty({
    nullable: true,
    type: [Object],
    example: [{ occurredAt: '2026-11-08T08:44:19.000Z', bpm: 110 }],
    description:
      'Série de fréquence cardiaque horodatée, décodée du fichier d’origine ; null tant qu’elle n’a pas été décodée',
  })
  heartRateSeries!: { occurredAt: Date; bpm: number }[] | null;
}
