import { ApiProperty } from '@nestjs/swagger';

export class ScheduledSessionResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-11-10' })
  date!: string;

  @ApiProperty({ type: String, example: 'swimming' })
  disciplineTypeKey!: string;

  @ApiProperty({ type: Number, example: 60 })
  durationMinutes!: number;
}

export class GeneratedPlanningResponseDto {
  @ApiProperty({ type: String, format: 'date', example: '2026-11-09' })
  from!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-11-15' })
  to!: string;

  @ApiProperty({
    type: [ScheduledSessionResponseDto],
    description: 'Séances créées par cette génération, triées comme proposées',
  })
  items!: ScheduledSessionResponseDto[];
}
