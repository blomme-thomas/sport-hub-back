import { ApiProperty } from '@nestjs/swagger';

export class ShoppingListItemResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
  })
  foodId!: string;

  @ApiProperty({ type: String, example: 'Riz basmati' })
  name!: string;

  @ApiProperty({ type: String, example: 'g' })
  unit!: string;

  @ApiProperty({
    enum: ['proteine', 'legume', 'feculent', 'autre'],
    example: 'feculent',
  })
  category!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 200,
    description: 'Somme des quantités connues sur la période ; null si aucune',
  })
  quantity!: number | null;

  @ApiProperty({
    type: Boolean,
    example: false,
    description:
      'true si au moins une occurrence n’a pas de quantité (à compléter à la main)',
  })
  quantityMissing!: boolean;
}
