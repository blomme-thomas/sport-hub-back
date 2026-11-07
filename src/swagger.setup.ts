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
import { operationIdFactory } from './openapi/operation-id.js';

export interface OpenApiSettings {
  title: string;
  version: string;
  serverUrl: string;
}

const API_TAGS: readonly { name: string; description: string }[] = [
  { name: 'health', description: 'Santé du service et de la base' },
  {
    name: 'garmin-sync',
    description: 'Synchronisation et consultation des activités Garmin',
  },
  {
    name: 'training-stats',
    description: "Statistiques de volume d'entraînement",
  },
  {
    name: 'workout-generation',
    description: "Génération de séances d'entraînement par IA",
  },
  {
    name: 'creneaux',
    description:
      'Créneaux de disponibilité libres ou occupés, ponctuels ou récurrents',
  },
];

/**
 * Construit le document OpenAPI de l'application à partir des décorateurs Nest, sans rien lire de la base.
 */
export function createOpenApiDocument(
  app: INestApplication,
  settings: OpenApiSettings,
): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle(settings.title)
    .setVersion(settings.version)
    .addServer(settings.serverUrl, 'API locale');
  for (const tag of API_TAGS) {
    builder.addTag(tag.name, tag.description);
  }
  return SwaggerModule.createDocument(app, builder.build(), {
    extraModels: [ProblemDetailsDto, ValidationErrorItemDto],
    operationIdFactory,
  });
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = app.get<AppConfig>(appConfig.KEY);
  return createOpenApiDocument(app, {
    title: config.name,
    version: process.env.npm_package_version ?? '0.0.0',
    serverUrl: `http://${config.host}:${config.port}`,
  });
}
