import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';
import { MAX_WEEKLY_TARGET_SECONDS } from '../../../domain/value-objects/weekly-target.vo.js';
import type { WeeklyTargetProgressDto } from '../../../application/use-cases/get-weekly-target-progress.use-case.js';
import type { UserSettingsDto } from '../../../application/use-cases/user-settings.use-cases.js';

export class UserSettingsResponseDto implements UserSettingsDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 28800,
    description: 'Cible hebdomadaire en secondes, null si aucune n’est définie',
  })
  weeklyTargetSeconds!: number | null;
}

export class UpdateUserSettingsRequestDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 28800,
    description:
      'Cible hebdomadaire en secondes (entier de 1 à 2147483647), null pour la retirer. Reste la même tant qu’elle n’est pas modifiée.',
  })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsInt()
  @Min(1)
  @Max(MAX_WEEKLY_TARGET_SECONDS)
  weeklyTargetSeconds!: number | null;
}

export class WeeklyTargetHistoryPointDto {
  @ApiProperty({ type: String, example: '2026-W46' })
  week!: string;

  @ApiProperty({ type: Number, example: 24120 })
  doneSeconds!: number;
}

export class WeeklyTargetProgressResponseDto implements WeeklyTargetProgressDto {
  @ApiProperty({ type: String, example: '2026-W47' })
  week!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 28800,
    description:
      'Cible réglée dans les paramètres, null si elle n’est pas définie',
  })
  targetSeconds!: number | null;

  @ApiProperty({
    type: Number,
    example: 24120,
    description: 'Durée réalisée sur la semaine ISO, en secondes',
  })
  doneSeconds!: number;

  @ApiProperty({
    type: [WeeklyTargetHistoryPointDto],
    description:
      'Huit dernières semaines, la plus ancienne en premier, semaine demandée en dernier',
  })
  history!: WeeklyTargetHistoryPointDto[];
}
