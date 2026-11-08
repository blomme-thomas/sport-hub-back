import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkSessionActivityRequestDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a10',
    description:
      'Identifiant d’une activité synchronisée du même jour que la séance',
  })
  @IsUUID()
  activityId!: string;
}
