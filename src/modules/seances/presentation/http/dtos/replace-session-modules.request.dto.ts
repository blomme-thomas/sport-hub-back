import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { SessionModuleRequestDto } from './session-module.request.dto.js';

export class ReplaceSessionModulesRequestDto {
  @ApiProperty({
    type: [SessionModuleRequestDto],
    maxItems: 30,
    description:
      'Liste ordonnée qui remplace les modules de la séance ; une liste vide vide la séance',
  })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SessionModuleRequestDto)
  modules!: SessionModuleRequestDto[];
}
