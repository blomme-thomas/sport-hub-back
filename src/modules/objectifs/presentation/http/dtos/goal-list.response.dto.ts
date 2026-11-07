import { ApiProperty } from '@nestjs/swagger';
import { GoalResponseDto } from './goal.response.dto.js';

export class GoalListResponseDto {
  @ApiProperty({
    type: [GoalResponseDto],
    description:
      'Objectifs triés par date cible croissante, sans date en dernier',
  })
  items!: GoalResponseDto[];
}
