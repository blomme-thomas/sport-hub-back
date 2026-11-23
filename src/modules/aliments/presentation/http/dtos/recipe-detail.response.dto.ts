import { ApiProperty } from '@nestjs/swagger';
import { RecipeResponseDto } from './recipe.response.dto.js';

export class RecipeNutritionTotalsResponseDto {
  @ApiProperty({ type: Number, example: 351.5 })
  calories!: number;

  @ApiProperty({ type: Number, example: 48.7 })
  proteins!: number;

  @ApiProperty({ type: Number, example: 22.4 })
  carbohydrates!: number;

  @ApiProperty({ type: Number, example: 5.6 })
  fats!: number;

  @ApiProperty({ type: Number, example: 0.1 })
  sugars!: number;
}

export class IgnoredNutritionLineResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  foodId!: string;

  @ApiProperty({
    enum: ['quantity-missing', 'nutrition-missing'],
    description:
      'Raison de l’exclusion du total : quantité absente ou valeur nutritionnelle vide',
  })
  reason!: string;
}

export class RecipeNutritionResponseDto {
  @ApiProperty({
    type: () => RecipeNutritionTotalsResponseDto,
    description: 'Totaux de la recette (valeurs pour la quantité indiquée)',
  })
  totals!: RecipeNutritionTotalsResponseDto;

  @ApiProperty({
    type: Object,
    description:
      'Totaux par composant ; les items sans composant sont regroupés sous « libre »',
    example: {
      proteine: {
        calories: 247.5,
        proteins: 46.5,
        carbohydrates: 0,
        fats: 5.4,
        sugars: 0,
      },
      legume: {
        calories: 0,
        proteins: 0,
        carbohydrates: 0,
        fats: 0,
        sugars: 0,
      },
      feculent: {
        calories: 104,
        proteins: 2.2,
        carbohydrates: 22.4,
        fats: 0.2,
        sugars: 0.1,
      },
      libre: {
        calories: 0,
        proteins: 0,
        carbohydrates: 0,
        fats: 0,
        sugars: 0,
      },
    },
  })
  byComponent!: Record<string, RecipeNutritionTotalsResponseDto>;

  @ApiProperty({
    type: () => [IgnoredNutritionLineResponseDto],
    description:
      'Items ignorés dans les totaux (sans quantité ou sans valeur nutritionnelle)',
  })
  ignored!: IgnoredNutritionLineResponseDto[];
}

export class RecipeDetailResponseDto extends RecipeResponseDto {
  @ApiProperty({ type: () => RecipeNutritionResponseDto })
  nutrition!: RecipeNutritionResponseDto;
}
