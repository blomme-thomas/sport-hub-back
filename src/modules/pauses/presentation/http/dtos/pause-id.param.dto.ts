import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PauseIdParamDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
    description: 'Identifiant de la pause',
  })
  @IsUUID()
  id!: string;
}
