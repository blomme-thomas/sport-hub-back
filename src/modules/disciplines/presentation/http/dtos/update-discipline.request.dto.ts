import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const LABEL_MAX_LENGTH = 60;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateDisciplineRequestDto {
  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: LABEL_MAX_LENGTH,
    example: 'Course à pied',
    description: 'Nouveau libellé, espaces en bordure retirés',
  })
  @Transform(trimString)
  @IsString()
  @Length(1, LABEL_MAX_LENGTH)
  label!: string;
}
