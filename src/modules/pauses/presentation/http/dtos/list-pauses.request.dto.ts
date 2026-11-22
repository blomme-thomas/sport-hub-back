import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class ListPausesRequestDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-12-01',
    description:
      'Début de la période (AAAA-MM-JJ) ; ne garde que les pauses qui la chevauchent',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-12-31',
    description: 'Fin de la période (AAAA-MM-JJ, incluse)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
