import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DEFAULT_DOMAIN_ERROR_STATUS,
  DOMAIN_ERROR_STATUS,
  GENERIC_PROBLEM_CODES,
  PROBLEM_CODES,
} from './error-status.table.js';

export class ValidationErrorItemDto {
  @ApiProperty({
    example: 'address.city',
    description: 'Chemin du champ en erreur',
  })
  field!: string;

  @ApiProperty({
    example: 'IS_NOT_EMPTY',
    description: 'Code de la contrainte',
  })
  code!: string;

  @ApiProperty({ example: 'city should not be empty' })
  message!: string;
}

const CODE_TABLE = [
  ...Object.entries(GENERIC_PROBLEM_CODES),
  ...Object.entries(DOMAIN_ERROR_STATUS),
]
  .map(([code, status]) =>
    code === 'CLIENT_ERROR'
      ? `- \`${code}\` : statut 4xx d'origine (401, 403, 405, 409, 415, 429...)`
      : `- \`${code}\` : ${status}`,
  )
  .join('\n');

export class ProblemDetailsDto {
  @ApiProperty({ example: 'urn:sport-hub:problem:validation-failed' })
  type!: string;

  @ApiProperty({ example: 'Bad Request' })
  title!: string;

  @ApiProperty({ example: 400 })
  status!: number;

  @ApiProperty({ example: 'La requête contient 2 erreur(s) de validation.' })
  detail!: string;

  @ApiProperty({ example: '/api/workouts' })
  instance!: string;

  @ApiProperty({
    enum: PROBLEM_CODES,
    enumName: 'ProblemCode',
    example: 'VALIDATION_FAILED',
    description: `Code stable de l'erreur. Statut associé :\n${CODE_TABLE}\n\nUne Business Error non mappée répond ${DEFAULT_DOMAIN_ERROR_STATUS}.`,
  })
  code!: string;

  @ApiProperty({
    description: 'Identifiant de corrélation (aussi dans X-Correlation-Id)',
  })
  correlationId!: string;

  @ApiPropertyOptional({
    type: [ValidationErrorItemDto],
    description: 'Présent uniquement pour VALIDATION_FAILED',
  })
  errors?: ValidationErrorItemDto[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string', enum: ['up', 'down'] },
    example: { database: 'down' },
    description:
      'Présent uniquement pour SERVICE_UNAVAILABLE : état des dépendances',
  })
  checks?: Record<string, 'up' | 'down'>;
}
