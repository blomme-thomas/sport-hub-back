import { ApiProperty } from '@nestjs/swagger';
import { SessionResponseDto } from './session.response.dto.js';

export class SessionListResponseDto {
  @ApiProperty({
    type: [SessionResponseDto],
    description: 'Séances de la période, triées par date croissante',
  })
  items!: SessionResponseDto[];
}
