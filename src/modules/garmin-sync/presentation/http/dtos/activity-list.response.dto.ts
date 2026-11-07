import { ApiProperty } from '@nestjs/swagger';

export class ActivitySummaryResponseDto {
  @ApiProperty({
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
    description: "Identifiant interne de l'activité",
  })
  id!: string;

  @ApiProperty({
    example: '12345678901',
    description: "Identifiant de l'activité côté Garmin",
  })
  garminActivityId!: string;

  @ApiProperty({
    example: 'running',
    description: "Type d'activité tel que fourni par Garmin",
  })
  type!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-01T06:30:00.000Z',
    description: "Date de début de l'activité",
  })
  startedAt!: Date;

  @ApiProperty({ example: 3600.5, description: 'Durée en secondes' })
  durationSeconds!: number;

  @ApiProperty({
    example: 10250.75,
    nullable: true,
    type: Number,
    description: 'Distance en mètres, null si Garmin ne la fournit pas',
  })
  distanceMeters!: number | null;
}

export class ActivityListResponseDto {
  @ApiProperty({ type: [ActivitySummaryResponseDto] })
  items!: ActivitySummaryResponseDto[];

  @ApiProperty({ example: 1, description: 'Numéro de la page renvoyée' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Taille de la page demandée' })
  pageSize!: number;

  @ApiProperty({
    example: 45,
    description: "Nombre total d'activités correspondant aux filtres",
  })
  total!: number;
}
