import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, ValidateIf } from 'class-validator';

const hasValue = (_object: object, value: unknown): boolean =>
  value !== undefined && value !== null;

export class FoodNutritionRequestDto {
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 350,
    description:
      'Calories pour 100 g ; absent ou null = vide (en modification, null efface la valeur)',
  })
  @ValidateIf(hasValue)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  calories?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 7,
    description: 'Protéines pour 100 g ; absent ou null = vide',
  })
  @ValidateIf(hasValue)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  proteins?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 78,
    description: 'Glucides pour 100 g ; absent ou null = vide',
  })
  @ValidateIf(hasValue)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  carbohydrates?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 0.6,
    description: 'Lipides pour 100 g ; absent ou null = vide',
  })
  @ValidateIf(hasValue)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  fats?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 0.1,
    description: 'Sucres pour 100 g ; absent ou null = vide',
  })
  @ValidateIf(hasValue)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  sugars?: number | null;
}
