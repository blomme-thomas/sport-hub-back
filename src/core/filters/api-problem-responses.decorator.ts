import { STATUS_CODES } from 'node:http';
import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import {
  ProblemDetailsDto,
  ValidationErrorItemDto,
} from './problem-details.dto.js';
import { PROBLEM_JSON_CONTENT_TYPE } from './problem-details.js';

export function ApiProblemResponses(
  ...statuses: number[]
): MethodDecorator & ClassDecorator {
  const unique = [...new Set([500, ...statuses])];
  return applyDecorators(
    ApiExtraModels(ProblemDetailsDto, ValidationErrorItemDto),
    ...unique.map((status) =>
      ApiResponse({
        status,
        description: STATUS_CODES[status],
        content: {
          [PROBLEM_JSON_CONTENT_TYPE]: {
            schema: { $ref: getSchemaPath(ProblemDetailsDto) },
          },
        },
      }),
    ),
  );
}
