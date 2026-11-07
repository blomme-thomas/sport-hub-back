import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WORKOUT_INTENSITY_LEVELS } from '../../../domain/value-objects/workout-intensity.vo.js';

export class GeneratedWorkoutStepResponseDto {
  @ApiProperty({ type: Number, minimum: 1, example: 1 })
  order!: number;

  @ApiProperty({ type: String, example: 'Échauffement' })
  label!: string;

  @ApiProperty({ type: Number, minimum: 1, example: 10 })
  durationMinutes!: number;

  @ApiProperty({
    type: String,
    enum: [...WORKOUT_INTENSITY_LEVELS],
    example: 'easy',
  })
  intensity!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Allure conversationnelle',
  })
  notes!: string | null;
}

export class WorkoutBasedOnResponseDto {
  @ApiProperty({
    type: Number,
    description: 'Nombre de semaines complètes utilisées',
    example: 4,
  })
  weeks!: number;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: 'Premier jour de la fenêtre (YYYY-MM-DD, UTC)',
    example: '2026-10-05',
  })
  from!: string | null;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: 'Dernier jour de la fenêtre (YYYY-MM-DD, UTC)',
    example: '2026-11-01',
  })
  to!: string | null;
}

export class GeneratedWorkoutResponseDto {
  @ApiProperty({ type: String, example: 'Fractionné court' })
  title!: string;

  @ApiProperty({ type: String, example: 'running' })
  sport!: string;

  @ApiProperty({
    type: String,
    example: 'Échauffement, fractions, retour au calme.',
  })
  summary!: string;

  @ApiProperty({ type: Number, minimum: 5, maximum: 300, example: 45 })
  totalDurationMinutes!: number;

  @ApiProperty({ type: () => [GeneratedWorkoutStepResponseDto] })
  steps!: GeneratedWorkoutStepResponseDto[];

  @ApiProperty({ type: () => WorkoutBasedOnResponseDto })
  basedOn!: WorkoutBasedOnResponseDto;
}
