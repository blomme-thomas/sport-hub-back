import { ApiProperty } from '@nestjs/swagger';

/** Réponse d'un import d'aliments ou de recettes : nombre créé et identifiants créés. */
export class AlimentsImportResponseDto {
  @ApiProperty({
    type: Number,
    example: 2,
    description: 'Nombre d’éléments créés',
  })
  createdCount!: number;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: ['3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f'],
    description: 'Identifiants des éléments créés, dans l’ordre du fichier',
  })
  ids!: string[];
}
