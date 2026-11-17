import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class SaveActivityCommentRequestDto {
  @ApiProperty({
    type: String,
    minLength: 1,
    example: "Séance difficile, j'ai tenu l'allure jusqu'au bout.",
    description:
      'Commentaire saisi à la main, qui remplace le commentaire existant ; espaces en bordure retirés. Pas de limite de longueur.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  text!: string;
}
