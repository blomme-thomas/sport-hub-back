import { ApiProperty } from '@nestjs/swagger';
import type { DashboardAdviceDto } from '../../../application/dtos/dashboard-advice.dto.js';

export class DashboardAdviceResponseDto {
  @ApiProperty({
    type: String,
    example: '2026-W45',
    description: 'Semaine ISO du conseil',
  })
  week!: string;

  @ApiProperty({
    type: String,
    example: 'Belle semaine de volume, garde la séance facile de jeudi.',
    description: 'Conseil en français, de 1 à 1000 caractères',
  })
  text!: string;

  @ApiProperty({
    enum: ['ia', 'insuffisant'],
    example: 'ia',
    description:
      "« insuffisant » si aucune activité n'a été enregistrée cette semaine (aucun appel au modèle)",
  })
  source!: 'ia' | 'insuffisant';

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'claude-sonnet-5-5',
    description: 'Modèle utilisé, null si le conseil est « insuffisant »',
  })
  model!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-08T10:00:00.000Z',
  })
  generatedAt!: Date;

  static fromDto(dto: DashboardAdviceDto): DashboardAdviceResponseDto {
    return Object.assign(new DashboardAdviceResponseDto(), {
      week: dto.week,
      text: dto.text,
      source: dto.source,
      model: dto.model,
      generatedAt: dto.generatedAt,
    });
  }
}
