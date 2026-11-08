import { ApiProperty } from '@nestjs/swagger';
import type { ActivityCommentDto } from '../../../application/dtos/activity-comment.dto.js';

export class ActivityCommentResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  activityId!: string;

  @ApiProperty({
    type: String,
    example: "Bonne sortie, l'allure est restée dans la zone visée.",
  })
  text!: string;

  @ApiProperty({ type: String, enum: ['ia', 'generique'], example: 'ia' })
  source!: string;

  @ApiProperty({ type: String, nullable: true, example: 'claude-sonnet-5-5' })
  model!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-12T20:00:00.000Z',
  })
  generatedAt!: string;

  static fromDto(dto: ActivityCommentDto): ActivityCommentResponseDto {
    return {
      activityId: dto.activityId,
      text: dto.text,
      source: dto.source,
      model: dto.model,
      generatedAt: dto.generatedAt.toISOString(),
    };
  }
}
