import { BadRequestException } from '@nestjs/common';
import type { ValidationErrorItem } from './problem-details.js';

export class RequestValidationException extends BadRequestException {
  /** `totalErrors` : nombre réel d'erreurs, si `errors` a été tronquée. */
  constructor(
    readonly errors: ValidationErrorItem[],
    readonly totalErrors: number = errors.length,
  ) {
    super('Validation failed');
  }
}
