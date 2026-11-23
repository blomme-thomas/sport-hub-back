import { ApiProperty } from '@nestjs/swagger';

export class FoodResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'Riz basmati' })
  name!: string;

  @ApiProperty({ type: String, example: 'g' })
  unit!: string;

  @ApiProperty({
    enum: ['proteine', 'legume', 'feculent', 'autre'],
    isArray: true,
    example: ['feculent'],
  })
  categories!: string[];

  @ApiProperty({ type: Number, nullable: true, example: 350 })
  calories!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 7 })
  proteins!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 78 })
  carbohydrates!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.6 })
  fats!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.1 })
  sugars!: number | null;
}
