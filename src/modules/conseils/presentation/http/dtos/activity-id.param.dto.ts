import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ActivityIdParamDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a10',
  })
  @IsUUID()
  id!: string;
}
