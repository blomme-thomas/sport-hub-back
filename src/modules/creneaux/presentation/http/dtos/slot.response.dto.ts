import { ApiProperty } from '@nestjs/swagger';

export class SlotResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
  })
  id!: string;

  @ApiProperty({ enum: ['libre', 'occupe'], example: 'libre' })
  type!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-05-04' })
  date!: string;

  @ApiProperty({ type: String, example: '09:00' })
  startTime!: string;

  @ApiProperty({ type: String, example: '10:30' })
  endTime!: string;

  @ApiProperty({ enum: ['aucune', 'hebdomadaire'], example: 'aucune' })
  recurrence!: string;

  @ApiProperty({ type: String, example: 'Europe/Paris' })
  timeZone!: string;
}
