import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

function parseBooleanQuery({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}

export class ListGoalsRequestDto {
  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    description:
      'true : seulement les objectifs à venir (date cible aujourd’hui ou postérieure, jour UTC) ; false ou absent : tous les objectifs',
  })
  @Transform(parseBooleanQuery)
  @IsOptional()
  @IsBoolean()
  upcoming?: boolean;
}
