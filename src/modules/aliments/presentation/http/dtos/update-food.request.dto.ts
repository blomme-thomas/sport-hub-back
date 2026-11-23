import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  ValidateIf,
} from 'class-validator';
import { FOOD_CATEGORIES } from '../../../domain/value-objects/food-category.vo.js';
import { FoodNutritionRequestDto } from './food-nutrition.request.dto.js';

const isProvided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class UpdateFoodRequestDto extends FoodNutritionRequestDto {
  @ApiPropertyOptional({
    type: String,
    example: 'Riz basmati',
    description: 'Nouveau nom, absent = inchangé',
  })
  @ValidateIf(isProvided)
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'g',
    description: 'Nouvelle unité, absente = inchangée',
  })
  @ValidateIf(isProvided)
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    enum: FOOD_CATEGORIES,
    isArray: true,
    example: ['proteine', 'legume'],
    description:
      'Nouvel ensemble de catégories qui remplace le précédent, absent = inchangé ; au moins une requise',
  })
  @ValidateIf(isProvided)
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(FOOD_CATEGORIES, { each: true })
  categories?: string[];
}
