import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsString } from 'class-validator';
import { FOOD_CATEGORIES } from '../../../domain/value-objects/food-category.vo.js';
import { FoodNutritionRequestDto } from './food-nutrition.request.dto.js';

export class CreateFoodRequestDto extends FoodNutritionRequestDto {
  @ApiProperty({
    type: String,
    example: 'Riz basmati',
    description:
      'Nom de l’aliment (1 à 200 caractères, espaces en bord retirés)',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    type: String,
    example: 'g',
    description:
      'Unité unique de l’aliment, sans conversion (1 à 20 caractères)',
  })
  @IsString()
  unit!: string;

  @ApiProperty({
    enum: FOOD_CATEGORIES,
    isArray: true,
    example: ['feculent'],
    description:
      'Une ou plusieurs catégories ; les doublons sont retirés. Au moins une est requise',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(FOOD_CATEGORIES, { each: true })
  categories!: string[];
}
