import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ActivityIdParamDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
    description: "Identifiant interne de l'activité",
  })
  @IsUUID()
  id!: string;
}
