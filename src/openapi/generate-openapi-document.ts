import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { createOpenApiDocument } from '../swagger.setup.js';
import { applyOpenApiEnv } from './openapi-env.js';
import { serializeOpenApi } from './openapi-serializer.js';

function readPackageVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  return packageJson.version;
}

export async function generateOpenApiDocument(): Promise<string> {
  const env = applyOpenApiEnv();
  const { AppModule } = await import('../app.module.js');
  const app = await NestFactory.create(AppModule, {
    preview: true,
    abortOnError: false,
    logger: false,
  });
  try {
    app.setGlobalPrefix(env.APP_GLOBAL_PREFIX);
    const document = createOpenApiDocument(app, {
      title: env.APP_NAME,
      version: readPackageVersion(),
      serverUrl: `http://${env.APP_HOST}:${env.APP_PORT}`,
    });
    return serializeOpenApi(document);
  } finally {
    await app.close();
  }
}
