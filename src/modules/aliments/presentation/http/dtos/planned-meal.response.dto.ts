import { ApiProperty } from '@nestjs/swagger';

export class PlannedMealResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e',
  })
  recipeId!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-11-25' })
  date!: string;

  @ApiProperty({ enum: ['matin', 'midi', 'soir'], example: 'midi' })
  mealTag!: string;
}
