import { ApiProperty } from '@nestjs/swagger';

export class HeartRateZonesResponseDto {
  @ApiProperty({
    example: true,
    description:
      "Faux si l'utilisateur n'a configuré aucune zone ; les seuils sont alors null",
  })
  available!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['HR_MAX', 'LACTATE_THRESHOLD', 'HR_RESERVE', 'CUSTOM'],
    example: 'HR_MAX',
    description: 'Méthode de calcul des zones',
  })
  trainingMethod!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 188 })
  maxHeartRateUsed!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 52 })
  restingHeartRateUsed!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 94,
    description: 'Borne basse de la zone 1',
  })
  zone1Floor!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 113,
    description: 'Borne basse de la zone 2',
  })
  zone2Floor!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 131,
    description: 'Borne basse de la zone 3',
  })
  zone3Floor!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 150,
    description: 'Borne basse de la zone 4',
  })
  zone4Floor!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 169,
    description: 'Borne basse de la zone 5',
  })
  zone5Floor!: number | null;
}
