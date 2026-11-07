import { ApiProperty } from '@nestjs/swagger';

export class GoalResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'Triathlon de Nice' })
  title!: string;

  @ApiProperty({
    enum: ['evenement', 'volume', 'regularite'],
    example: 'evenement',
  })
  type!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2027-06-20',
  })
  targetDate!: string | null;

  @ApiProperty({
    enum: ['sprint', 'olympique', 'half', 'full', 'autre'],
    nullable: true,
    example: 'olympique',
  })
  eventFormat!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 7200 })
  targetTimeSeconds!: number | null;
}
