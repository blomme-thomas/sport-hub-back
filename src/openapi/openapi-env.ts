import type { z } from 'zod';
import { appEnvSchema, parseEnv } from '../core/config/env.validation.js';

const DATABASE_NAME = 'sporthub';
const DATABASE_USER = 'sporthub';
const DATABASE_PASSWORD = 'sporthub';
const DATABASE_HOST = 'localhost';
const DATABASE_PORT = '5432';

export type OpenApiAppEnv = z.output<typeof appEnvSchema>;

export function applyOpenApiEnv(): OpenApiAppEnv {
  const defaults = parseEnv(appEnvSchema, {});

  process.env.APP_NAME = defaults.APP_NAME;
  process.env.APP_HOST = defaults.APP_HOST;
  process.env.APP_PORT = String(defaults.APP_PORT);
  process.env.APP_GLOBAL_PREFIX = defaults.APP_GLOBAL_PREFIX;

  process.env.DB_NAME = DATABASE_NAME;
  process.env.DB_USERNAME = DATABASE_USER;
  process.env.DB_PASSWORD = DATABASE_PASSWORD;
  process.env.DB_HOST = DATABASE_HOST;
  process.env.DB_PORT = DATABASE_PORT;
  process.env.DATABASE_URL = `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`;

  process.env.GARMIN_SYNC_CRON_ENABLED = 'false';
  process.env.GARMIN_PERSONAL_API_KEY = '';
  process.env.ANTHROPIC_API_KEY = '';

  return defaults;
}
