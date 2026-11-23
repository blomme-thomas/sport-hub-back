import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { FOOD_CATEGORIES } from '../../../domain/value-objects/food-category.vo.js';

export class ListFoodsRequestDto {
  @ApiPropertyOptional({
    enum: FOOD_CATEGORIES,
    example: 'proteine',
    description:
      'Ne renvoie que les aliments portant cette catégorie, parmi les autres qu’ils peuvent porter',
  })
  @IsOptional()
  @IsIn(FOOD_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'riz',
    description:
      'Recherche dans le nom, sans tenir compte de la casse (sous-chaîne)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
