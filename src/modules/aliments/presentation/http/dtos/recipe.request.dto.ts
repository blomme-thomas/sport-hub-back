import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MEAL_TAGS } from '../../../domain/value-objects/meal-tag.vo.js';
import { RECIPE_COMPONENTS } from '../../../domain/value-objects/recipe-component.vo.js';

export class RecipeItemRequestDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
    description: 'Identifiant de l’aliment',
  })
  @IsUUID()
  foodId!: string;

  @ApiPropertyOptional({
    enum: RECIPE_COMPONENTS,
    nullable: true,
    example: 'feculent',
    description:
      'Composant de la recette (absent ou null = sélection libre, ex. petit-déjeuner). L’aliment doit appartenir à cette famille',
  })
  @IsOptional()
  @IsIn(RECIPE_COMPONENTS)
  component?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 120,
    description: 'Quantité, dans l’unité de l’aliment ; absente ou null = vide',
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  quantity?: number | null;
}

export class CreateRecipeRequestDto {
  @ApiProperty({
    type: String,
    example: 'Riz au poulet',
    description: 'Nom de la recette (1 à 200 caractères)',
  })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    enum: MEAL_TAGS,
    isArray: true,
    example: ['midi', 'soir'],
    description: 'Un ou plusieurs repas ; les doublons sont retirés',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(MEAL_TAGS, { each: true })
  mealTags!: string[];

  @ApiPropertyOptional({
    type: () => [RecipeItemRequestDto],
    description: 'Composition facultative ; aucun composant n’est obligatoire',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemRequestDto)
  items?: RecipeItemRequestDto[];
}

export class UpdateRecipeRequestDto {
  @ApiPropertyOptional({ type: String, example: 'Riz au poulet' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    enum: MEAL_TAGS,
    isArray: true,
    description: 'Remplace les tags de repas',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(MEAL_TAGS, { each: true })
  mealTags?: string[];

  @ApiPropertyOptional({
    type: () => [RecipeItemRequestDto],
    description: 'Remplace l’ensemble de la composition',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemRequestDto)
  items?: RecipeItemRequestDto[];
}

export class PreviewRecipeNutritionRequestDto {
  @ApiPropertyOptional({
    type: () => [RecipeItemRequestDto],
    description:
      'Composition à évaluer ; rien n’est enregistré. Absente ou vide = synthèse nulle',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemRequestDto)
  items?: RecipeItemRequestDto[];
}
