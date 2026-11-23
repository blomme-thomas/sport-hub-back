import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RecipeIdParamDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e',
    description: 'Identifiant de la recette',
  })
  @IsUUID()
  id!: string;
}
