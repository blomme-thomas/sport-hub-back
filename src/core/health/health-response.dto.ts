import { ApiProperty } from '@nestjs/swagger';

export class HealthChecksDto {
  @ApiProperty({ example: 'up', enum: ['up'], description: 'État de la base' })
  database!: 'up';
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'État du service' })
  status!: 'ok';

  @ApiProperty({ type: HealthChecksDto, description: 'État des dépendances' })
  checks!: HealthChecksDto;
}
