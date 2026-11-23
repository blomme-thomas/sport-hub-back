import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { MEAL_TAGS } from '../../../domain/value-objects/meal-tag.vo.js';

export class PlannedMealWeekQueryDto {
  @ApiProperty({
    type: String,
    example: '2026-W48',
    description: 'Semaine ISO au format AAAA-Www',
  })
  @IsString()
  @Matches(/^\d{4}-W\d{2}$/)
  week!: string;
}

export class CreatePlannedMealRequestDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e',
    description: 'Recette à placer',
  })
  @IsUUID()
  recipeId!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-25',
    description: 'Date du repas, au format AAAA-MM-JJ',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ enum: MEAL_TAGS, example: 'midi' })
  @IsIn(MEAL_TAGS)
  mealTag!: string;
}

export class MovePlannedMealRequestDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-11-26',
    description: 'Nouvelle date ; absente = inchangée',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiPropertyOptional({
    enum: MEAL_TAGS,
    description: 'Nouveau repas ; absent = inchangé',
  })
  @IsOptional()
  @IsIn(MEAL_TAGS)
  mealTag?: string;
}

export class PlannedMealIdParamDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
    description: 'Identifiant du repas planifié',
  })
  @IsUUID()
  id!: string;
}
