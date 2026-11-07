import { ApiProperty } from '@nestjs/swagger';

export class DisciplineResponseDto {
  @ApiProperty({
    type: String,
    example: 'running',
    description: 'Clé de type telle que fournie par Garmin, stable et unique',
  })
  typeKey!: string;

  @ApiProperty({
    type: String,
    example: 'Course à pied',
    description:
      'Libellé affiché : la clé de type tant que la discipline n’a pas été renommée',
  })
  label!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-01T06:30:00.000Z',
    description:
      'Instant de la première synchronisation qui a vu la discipline',
  })
  firstSeenAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-07T10:00:00.000Z',
    description:
      'Instant de la dernière synchronisation qui a vu la discipline',
  })
  lastSeenAt!: Date;
}
