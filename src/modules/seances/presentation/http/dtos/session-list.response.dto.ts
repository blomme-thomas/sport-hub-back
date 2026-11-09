import { ApiProperty } from '@nestjs/swagger';
import { SESSION_RECURRENCES } from '../../../domain/value-objects/session-recurrence.vo.js';
import { SESSION_STATUSES } from '../../../domain/value-objects/session-status.vo.js';

export class SessionOccurrenceResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
    description: 'Identifiant de la séance à laquelle appartient l’occurrence',
  })
  sessionId!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-11-23' })
  date!: string;

  @ApiProperty({ type: String, nullable: true, example: '18:00' })
  startTime!: string | null;

  @ApiProperty({ type: Number, example: 60 })
  durationMinutes!: number;

  @ApiProperty({ type: String, example: 'swimming' })
  disciplineTypeKey!: string;

  @ApiProperty({ enum: SESSION_RECURRENCES, example: 'hebdomadaire' })
  recurrence!: string;

  @ApiProperty({ enum: SESSION_STATUSES, example: 'planifiee' })
  status!: string;
}

export class SessionOccurrenceListResponseDto {
  @ApiProperty({
    type: [SessionOccurrenceResponseDto],
    description:
      'Occurrences de la période, triées par date, heure puis identifiant de séance',
  })
  items!: SessionOccurrenceResponseDto[];
}
