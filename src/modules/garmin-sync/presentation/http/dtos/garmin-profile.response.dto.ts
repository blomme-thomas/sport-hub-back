import { ApiProperty } from '@nestjs/swagger';

export class GarminProfileResponseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Thomas',
    description:
      'Nom affiché du compte Garmin ; null si Garmin ne le fournit pas',
  })
  displayName!: string | null;
}
