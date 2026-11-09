import { ApiProperty } from '@nestjs/swagger';
import { DASHBOARD_PERIODS } from '../../../domain/value-objects/dashboard-period.vo.js';

export class DashboardTotalsResponseDto {
  @ApiProperty({ example: 4, description: 'Nombre de séances' })
  count!: number;

  @ApiProperty({ example: 9000.5, description: 'Durée totale en secondes' })
  durationSeconds!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 2100,
    description:
      'Somme des calories journalières Garmin (total de la journée, repos inclus) des jours de la période qui en ont une ; null si aucun jour n’en a. Ne reprend pas les calories des séances. Le jour en cours peut être partiel',
  })
  calories!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 340,
    description:
      'Somme du dénivelé positif en mètres des séances qui le renseignent ; null si aucune ne le renseigne',
  })
  elevationGainMeters!: number | null;
}

export class DashboardSportResponseDto {
  @ApiProperty({ example: 'running', description: "Type d'activité" })
  type!: string;

  @ApiProperty({ example: 2 })
  count!: number;

  @ApiProperty({ example: 4000 })
  durationSeconds!: number;
}

export class DashboardDayResponseDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-07',
    description: 'Jour calendaire UTC',
  })
  date!: string;

  @ApiProperty({ example: 1 })
  count!: number;

  @ApiProperty({ example: 3600 })
  durationSeconds!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 2350,
    description:
      'Calories journalières Garmin du jour (total de la journée, repos inclus) ; null sans donnée Garmin pour ce jour, jamais 0. Le jour en cours peut être partiel',
  })
  calories!: number | null;
}

export class DashboardVariationResponseDto {
  @ApiProperty({
    enum: ['up', 'down', 'flat', 'unknown'],
    example: 'up',
    description:
      "Variation de la durée totale par rapport à la période précédente ; unknown si la période précédente n'a aucune séance",
  })
  direction!: 'up' | 'down' | 'flat' | 'unknown';

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 12.5,
    description:
      'Écart en pourcentage arrondi à une décimale ; null si unknown',
  })
  percent!: number | null;
}

export class DashboardStatsResponseDto {
  @ApiProperty({ enum: DASHBOARD_PERIODS, example: '30d' })
  period!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-10-09' })
  from!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-07',
    description: 'Dernier jour de la période (inclus)',
  })
  to!: string;

  @ApiProperty({ type: DashboardTotalsResponseDto })
  totals!: DashboardTotalsResponseDto;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 148.2,
    description:
      'Moyenne des FC moyennes des séances qui les renseignent ; null si aucune',
  })
  averageHeartRate!: number | null;

  @ApiProperty({
    type: [Number],
    nullable: true,
    isArray: true,
    example: [1200, 800, 300, null, null],
    description:
      "Temps passé dans les zones cardiaques 1 à 5 (somme des séances). Unité supposée en secondes, non confirmée par la spec Garmin ; null pour une zone qu'aucune séance ne renseigne",
  })
  hrTimeInZone!: (number | null)[];

  @ApiProperty({ type: [DashboardSportResponseDto] })
  bySport!: DashboardSportResponseDto[];

  @ApiProperty({
    type: [DashboardDayResponseDto],
    description: 'Une entrée par jour de la période, jours vides compris',
  })
  daily!: DashboardDayResponseDto[];

  @ApiProperty({ type: DashboardVariationResponseDto })
  variation!: DashboardVariationResponseDto;
}
