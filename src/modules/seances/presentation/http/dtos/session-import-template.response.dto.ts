import { ApiProperty } from '@nestjs/swagger';

export class SessionImportTemplateResponseDto {
  @ApiProperty({
    type: String,
    example: 'plan-seances',
    description: 'Type de fichier, à reprendre tel quel',
  })
  kind!: string;

  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Version du format du fichier',
  })
  schemaVersion!: number;

  @ApiProperty({
    type: String,
    example: '<UUID v4 unique pour ce fichier>',
    description: 'Identifiant unique du fichier, à générer pour chaque fichier',
  })
  importId!: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    description:
      'Séances du fichier. Chaque champ à valeurs fermées liste ses valeurs possibles à sa place ; les clés de discipline sont celles du référentiel courant.',
  })
  seances!: Record<string, unknown>[];
}
