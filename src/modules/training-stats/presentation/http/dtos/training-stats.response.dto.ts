import { ApiProperty } from '@nestjs/swagger';

export class VolumeResponseDto {
  @ApiProperty({ example: 3, description: 'Nombre de séances' })
  count!: number;

  @ApiProperty({ example: 9000.5, description: 'Durée totale en secondes' })
  durationSeconds!: number;

  @ApiProperty({
    example: 50000,
    description:
      'Distance totale en mètres ; une séance sans distance compte pour zéro mètre',
  })
  distanceMeters!: number;
}

export class TypeVolumeResponseDto extends VolumeResponseDto {
  @ApiProperty({ example: 'running', description: "Type d'activité" })
  type!: string;
}

export class MetricVariationResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Écart absolu : valeur courante moins valeur précédente',
  })
  absolute!: number;

  @ApiProperty({
    example: 50,
    nullable: true,
    type: Number,
    description:
      'Écart en pourcentage de la valeur précédente, arrondi à une décimale ; null si la période précédente vaut zéro',
  })
  percent!: number | null;
}

export class VariationResponseDto {
  @ApiProperty({ type: MetricVariationResponseDto })
  count!: MetricVariationResponseDto;

  @ApiProperty({ type: MetricVariationResponseDto })
  durationSeconds!: MetricVariationResponseDto;

  @ApiProperty({ type: MetricVariationResponseDto })
  distanceMeters!: MetricVariationResponseDto;
}

export class TypeVariationResponseDto extends VariationResponseDto {
  @ApiProperty({ example: 'running', description: "Type d'activité" })
  type!: string;
}

export class PeriodVariationResponseDto {
  @ApiProperty({ type: VariationResponseDto })
  totals!: VariationResponseDto;

  @ApiProperty({ type: [TypeVariationResponseDto] })
  byType!: TypeVariationResponseDto[];
}

export class PreviousPeriodResponseDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-04T00:00:00.000Z',
    description: 'Début de la période précédente (incluse)',
  })
  start!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-10T23:59:59.999Z',
    description: 'Fin de la période précédente (incluse)',
  })
  end!: Date;

  @ApiProperty({ type: VolumeResponseDto })
  totals!: VolumeResponseDto;

  @ApiProperty({ type: [TypeVolumeResponseDto] })
  byType!: TypeVolumeResponseDto[];
}

export class PeriodStatsResponseDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-11T00:00:00.000Z',
    description: 'Début de la période (incluse)',
  })
  start!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-17T23:59:59.999Z',
    description: 'Fin de la période (incluse, dernière milliseconde)',
  })
  end!: Date;

  @ApiProperty({ type: VolumeResponseDto })
  totals!: VolumeResponseDto;

  @ApiProperty({
    type: [TypeVolumeResponseDto],
    description:
      'Volumes par type, triés par type ; vide si la période est vide',
  })
  byType!: TypeVolumeResponseDto[];

  @ApiProperty({ type: PreviousPeriodResponseDto })
  previous!: PreviousPeriodResponseDto;

  @ApiProperty({ type: PeriodVariationResponseDto })
  variation!: PeriodVariationResponseDto;
}

export class TrainingStatsResponseDto {
  @ApiProperty({ enum: ['week', 'month'], example: 'week' })
  granularity!: 'week' | 'month';

  @ApiProperty({ type: String, format: 'date', example: '2026-05-11' })
  from!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-05-31' })
  to!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'running',
    description: 'Type filtré, null si tous les types sont inclus',
  })
  type!: string | null;

  @ApiProperty({
    type: [PeriodStatsResponseDto],
    description:
      'Périodes complètes de la plage, en ordre chronologique ; une période sans activité a des valeurs à zéro',
  })
  periods!: PeriodStatsResponseDto[];
}
