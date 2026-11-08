import { ApiProperty } from '@nestjs/swagger';

export class ReconciledPairResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  sessionId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  activityId!: string;
}

export class ReconcileSessionsResponseDto {
  @ApiProperty({
    type: [ReconciledPairResponseDto],
    description:
      'Rapprochements automatiques créés par cet appel ; les cas ambigus ne figurent pas dans la liste',
  })
  items!: ReconciledPairResponseDto[];
}
