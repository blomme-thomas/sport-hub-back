import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SessionExportParamDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  })
  @IsUUID()
  id!: string;
}
