import { ApiProperty } from '@nestjs/swagger';

export class SlotOccurrenceResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
    description: 'Créneau dont provient l’occurrence',
  })
  slotId!: string;

  @ApiProperty({ enum: ['libre', 'occupe'], example: 'occupe' })
  type!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-05-11',
    description: "Jour de l'occurrence",
  })
  date!: string;

  @ApiProperty({ type: String, example: '09:00' })
  startTime!: string;

  @ApiProperty({ type: String, example: '10:30' })
  endTime!: string;

  @ApiProperty({ enum: ['aucune', 'hebdomadaire'], example: 'hebdomadaire' })
  recurrence!: string;

  @ApiProperty({ type: String, example: 'Europe/Paris' })
  timeZone!: string;
}

export class SlotOccurrencesResponseDto {
  @ApiProperty({ type: String, format: 'date', example: '2026-05-01' })
  from!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-05-31' })
  to!: string;

  @ApiProperty({
    type: [SlotOccurrenceResponseDto],
    description:
      'Occurrences de la période, triées par date, heure de début puis identifiant ; les créneaux qui se chevauchent sont tous présents',
  })
  items!: SlotOccurrenceResponseDto[];
}
