import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class DeleteRecipeQueryDto {
  @ApiPropertyOptional({
    enum: ['true', 'false'],
    description:
      'true = confirme la suppression d’une recette planifiée et retire ses repas du planning',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  confirm?: string;
}
