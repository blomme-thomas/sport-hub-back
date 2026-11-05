import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import appConfig, { type AppConfig } from './core/config/app/app.config.js';

async function bootstrap(): Promise<void> {
  // abortOnError: false pour que l'échec (ex. configuration invalide) passe par le catch ci-dessous.
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  configureApp(app);
  // Sans cela, onModuleDestroy (ex. fermeture de la connexion Prisma) ne s'exécute pas à l'arrêt (Ctrl+C, SIGTERM).
  app.enableShutdownHooks();

  const config = app.get<AppConfig>(appConfig.KEY);

  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.name)
    .setVersion(process.env.npm_package_version ?? '0.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  await app.listen(config.port, config.host);
}

void bootstrap().catch((error: unknown) => {
  console.error("Erreur au démarrage de l'application :", error);
  process.exit(1);
});
