import { ApiProperty } from '@nestjs/swagger';

export class RecipeItemResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
  })
  foodId!: string;

  @ApiProperty({
    enum: ['proteine', 'legume', 'feculent'],
    nullable: true,
    example: 'feculent',
  })
  component!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 120 })
  quantity!: number | null;
}

export class RecipeResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'Riz au poulet' })
  name!: string;

  @ApiProperty({
    enum: ['matin', 'midi', 'soir'],
    isArray: true,
    example: ['midi', 'soir'],
  })
  mealTags!: string[];

  @ApiProperty({ type: () => [RecipeItemResponseDto] })
  items!: RecipeItemResponseDto[];
}
