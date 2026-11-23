import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ShoppingListQueryDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-23',
    description: 'Premier jour de la période, inclus (AAAA-MM-JJ)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-29',
    description: 'Dernier jour de la période, inclus (AAAA-MM-JJ)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;
}
