import { ApiProperty } from '@nestjs/swagger';

export class SyncGarminActivitiesResponseDto {
  @ApiProperty({
    example: 3,
    description: 'Activités enregistrées pour la première fois',
  })
  created!: number;

  @ApiProperty({
    example: 1,
    description: 'Activités déjà connues que Garmin a modifiées',
  })
  updated!: number;

  @ApiProperty({
    example: 12,
    description: 'Activités déjà connues et inchangées',
  })
  ignored!: number;
}
