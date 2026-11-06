import { BadRequestException } from '@nestjs/common';
import type { ValidationErrorItem } from './problem-details.js';

export class RequestValidationException extends BadRequestException {
  constructor(
    readonly errors: ValidationErrorItem[],
    readonly totalErrors: number = errors.length,
  ) {
    super('Validation failed');
  }
}
