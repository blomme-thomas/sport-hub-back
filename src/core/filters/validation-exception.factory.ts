import type { ValidationError } from 'class-validator';
import type { ValidationErrorItem } from './problem-details.js';
import { RequestValidationException } from './request-validation.exception.js';

export const MAX_VALIDATION_ERRORS = 100;

function toUpperSnake(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

function joinPath(
  parentPath: string | undefined,
  property: string,
  parentIsArray: boolean,
): string {
  if (parentPath === undefined || parentPath === '') return property;
  return parentIsArray
    ? `${parentPath}[${property}]`
    : `${parentPath}.${property}`;
}

function flatten(
  errors: ValidationError[],
  parentPath: string | undefined,
  parentIsArray: boolean,
): ValidationErrorItem[] {
  const items: ValidationErrorItem[] = [];
  for (const error of errors) {
    const field = joinPath(parentPath, error.property, parentIsArray);
    for (const [key, message] of Object.entries(error.constraints ?? {})) {
      items.push({
        field,
        code:
          key === 'whitelistValidation'
            ? 'PROPERTY_NOT_ALLOWED'
            : toUpperSnake(key),
        message,
      });
    }
    const children = error.children ?? [];
    if (children.length > 0) {
      const childrenAreIndexes =
        error.value !== undefined
          ? Array.isArray(error.value)
          : children.every((c) => /^\d+$/.test(c.property));
      items.push(...flatten(children, field, childrenAreIndexes));
    }
  }
  return items;
}

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath?: string,
): ValidationErrorItem[] {
  return flatten(errors, parentPath, false);
}

export function validationExceptionFactory(
  errors: ValidationError[],
): RequestValidationException {
  const items = flattenValidationErrors(errors);
  return new RequestValidationException(
    items.slice(0, MAX_VALIDATION_ERRORS),
    items.length,
  );
}
