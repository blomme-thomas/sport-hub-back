import { type INestApplication, ValidationPipe } from '@nestjs/common';
import appConfig, { type AppConfig } from './core/config/app/app.config.js';

/**
 * Réglages HTTP communs à l'application et aux tests e2e, pour que les tests
 * voient les mêmes routes (préfixe, validation, CORS) qu'en production.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<AppConfig>(appConfig.KEY);

  app.useLogger(config.logLevels);
  app.setGlobalPrefix(config.globalPrefix);
  app.enableCors({ origin: config.corsOrigin });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
