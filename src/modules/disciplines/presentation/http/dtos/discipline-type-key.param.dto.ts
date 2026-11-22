import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class DisciplineTypeKeyParamDto {
  @ApiProperty({
    type: String,
    example: 'running',
    description: 'Clé de type de la discipline',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  typeKey!: string;
}
