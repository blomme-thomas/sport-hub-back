import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import appConfig, { type AppConfig } from './core/config/app/app.config.js';
import {
  ProblemDetailsDto,
  ValidationErrorItemDto,
} from './core/filters/problem-details.dto.js';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = app.get<AppConfig>(appConfig.KEY);
  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.name)
    .setVersion(process.env.npm_package_version ?? '0.0.0')
    .build();
  return SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [ProblemDetailsDto, ValidationErrorItemDto],
  });
}
