import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class ImportSessionsRequestDto {
  @ApiProperty({
    type: String,
    example: 'plan-seances',
    description: 'Type de fichier, à reprendre du modèle',
  })
  @IsOptional()
  kind?: string;

  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Version du format, à reprendre du modèle',
  })
  @IsOptional()
  schemaVersion?: number;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    description:
      'Identifiant unique du fichier : un fichier déjà importé est refusé',
  })
  @IsOptional()
  importId?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    minItems: 1,
    description:
      'Séances à ajouter, toutes planifiées ; une seule séance invalide fait refuser le fichier entier',
  })
  @IsOptional()
  seances?: unknown[];
}
