import { ApiProperty } from '@nestjs/swagger';
import type { WeeklyReviewDto } from '../../../application/dtos/weekly-review.dto.js';

export class WeeklyReviewResponseDto {
  @ApiProperty({ type: String, example: '2026-W45' })
  week!: string;

  @ApiProperty({
    type: String,
    example:
      'Trois séances prévues, trois réalisées ; volume en hausse de 12 %.',
  })
  suivi!: string;

  @ApiProperty({
    type: String,
    example: 'La sortie longue a été un peu rapide par rapport à la consigne.',
  })
  pointAttention!: string;

  @ApiProperty({
    type: String,
    example: 'Garde la séance de mercredi en endurance fondamentale.',
  })
  conseil!: string;

  @ApiProperty({ type: String, enum: ['ia', 'generique'], example: 'ia' })
  source!: string;

  @ApiProperty({ type: String, nullable: true, example: 'claude-sonnet-5-5' })
  model!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-09T10:00:00.000Z',
  })
  generatedAt!: string;

  static fromDto(dto: WeeklyReviewDto): WeeklyReviewResponseDto {
    return {
      week: dto.week,
      suivi: dto.suivi,
      pointAttention: dto.pointAttention,
      conseil: dto.conseil,
      source: dto.source,
      model: dto.model,
      generatedAt: dto.generatedAt.toISOString(),
    };
  }
}
