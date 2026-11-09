import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsCalendarDate } from '../validators/session.validators.js';

export class SessionOccurrenceParamDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
    description: 'Identifiant de la séance',
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-11-16',
    description:
      'Date de programmation de l’occurrence dans la série (YYYY-MM-DD), avant tout déplacement',
  })
  @IsCalendarDate
  date!: string;
}
