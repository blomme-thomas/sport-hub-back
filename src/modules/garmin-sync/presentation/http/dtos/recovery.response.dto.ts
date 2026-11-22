import { ApiProperty } from '@nestjs/swagger';

export class RecoveryDayResponseDto {
  @ApiProperty({ type: String, format: 'date', example: '2026-11-07' })
  date!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 27600,
    description: 'Durée de sommeil en secondes ; null si aucune donnée',
  })
  sleepSeconds!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 48,
    description: 'Moyenne HRV de la nuit ; null si aucune donnée',
  })
  hrvLastNightAvg!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 51,
    description: 'Moyenne HRV hebdomadaire ; null si aucune donnée',
  })
  hrvWeeklyAvg!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 85,
    description:
      'Body Battery rechargée sur la journée (0 à 100) ; null si aucune donnée',
  })
  bodyBatteryCharged!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 40,
    description:
      'Body Battery drainée sur la journée (0 à 100) ; null si aucune donnée',
  })
  bodyBatteryDrained!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 52,
    description: 'Fréquence cardiaque de repos en bpm ; null si aucune donnée',
  })
  restingHeartRate!: number | null;
}

export class RecoveryResponseDto {
  @ApiProperty({ type: String, format: 'date', example: '2026-11-01' })
  from!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-11-07' })
  to!: string;

  @ApiProperty({
    type: [RecoveryDayResponseDto],
    description: 'Un élément par jour de la plage, dans l’ordre chronologique',
  })
  days!: RecoveryDayResponseDto[];
}
