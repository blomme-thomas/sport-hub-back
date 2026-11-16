import { ApiProperty } from '@nestjs/swagger';
import type {
  WeeklyGoalDto,
  WeeklyGoalHistoryPointDto,
} from '../../../application/use-cases/get-weekly-goal.use-case.js';

export class WeeklyGoalHistoryPointResponseDto implements WeeklyGoalHistoryPointDto {
  @ApiProperty({ type: String, example: '2026-W46' })
  week!: string;

  @ApiProperty({ type: Number, example: 24120 })
  doneSeconds!: number;
}

export class WeeklyGoalResponseDto implements WeeklyGoalDto {
  @ApiProperty({ type: String, example: '2026-W46' })
  week!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 28800,
    description:
      'Temps cible de la semaine en secondes, null sans objectif hebdomadaire',
  })
  targetSeconds!: number | null;

  @ApiProperty({
    type: Number,
    example: 24120,
    description: 'Durée réalisée sur la semaine ISO, en secondes',
  })
  doneSeconds!: number;

  @ApiProperty({
    type: [WeeklyGoalHistoryPointResponseDto],
    description:
      'Huit dernières semaines, la plus ancienne en premier, semaine demandée en dernier',
  })
  history!: WeeklyGoalHistoryPointResponseDto[];
}
