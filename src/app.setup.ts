import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import appConfig, { type AppConfig } from './core/config/app/app.config.js';
import { ProblemDetailsExceptionFilter } from './core/filters/problem-details.exception-filter.js';
import { validationExceptionFactory } from './core/filters/validation-exception.factory.js';
import { correlationIdMiddleware } from './core/middlewares/correlation-id.middleware.js';

/**
 * Réglages HTTP communs à l'application et aux tests e2e, pour que les tests
 * voient les mêmes routes (préfixe, validation, erreurs, CORS) qu'en production.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<AppConfig>(appConfig.KEY);

  // En premier : l'identifiant de corrélation doit exister pour toute requête, 404 compris.
  app.use(correlationIdMiddleware);
  app.useLogger(config.logLevels);
  app.setGlobalPrefix(config.globalPrefix);
  app.enableCors({
    origin: config.corsOrigin,
    exposedHeaders: ['X-Correlation-Id'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(
    new ProblemDetailsExceptionFilter(app.get(HttpAdapterHost)),
  );
}
