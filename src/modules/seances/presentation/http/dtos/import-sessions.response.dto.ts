import { ApiProperty } from '@nestjs/swagger';

export class ImportSessionsResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  importId!: string;

  @ApiProperty({ type: Number, example: 7 })
  createdCount!: number;

  @ApiProperty({ type: [String], format: 'uuid' })
  sessionIds!: string[];
}
