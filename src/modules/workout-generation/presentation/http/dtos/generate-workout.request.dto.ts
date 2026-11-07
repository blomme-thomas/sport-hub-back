import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateWorkoutRequestDto {
  @ApiPropertyOptional({
    type: String,
    maxLength: 64,
    example: 'course à pied',
    description: 'Sport visé ; absent = sport déduit du contexte',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sport?: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 200,
    example: 'préparer un 10 km en juin',
    description: "Objectif de l'athlète, transmis à l'IA comme donnée",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  goal?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 10,
    maximum: 240,
    example: 45,
    description: 'Durée souhaitée de la séance, en minutes entières',
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(240)
  durationMinutes?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 12,
    default: 4,
    description:
      'Nombre de semaines complètes de statistiques prises en compte (4 par défaut)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  weeks?: number;
}
