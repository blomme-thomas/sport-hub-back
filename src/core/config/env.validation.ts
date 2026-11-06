import type { LogLevel } from '@nestjs/common';
import { z } from 'zod';

export const APP_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export const LOG_LEVEL_VALUES = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
  'fatal',
] as const satisfies readonly LogLevel[];

export const appEnvSchema = z.object({
  NODE_ENV: z.enum(APP_ENVIRONMENTS).default('development'),

  APP_NAME: z.string().min(1).default('sport-hub-back'),
  APP_HOST: z.string().min(1).default('localhost'),
  APP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_GLOBAL_PREFIX: z.string().default('api'),
  APP_LOG_LEVEL: z.enum(LOG_LEVEL_VALUES).default('log'),
  APP_CORS_ORIGIN: z.url().default('http://localhost:4200'),
});

const databaseEnvShape = z.object({
  DB_NAME: z.string().min(1),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'doit commencer par postgresql://'),
});

type DatabaseEnv = z.infer<typeof databaseEnvShape>;

function checkDatabaseUrl(env: DatabaseEnv, ctx: z.RefinementCtx): void {
  let parts: Record<keyof Omit<DatabaseEnv, 'DATABASE_URL'>, string>;
  try {
    const url = new URL(env.DATABASE_URL);
    parts = {
      DB_HOST: url.hostname,
      DB_PORT: url.port || '5432',
      DB_USERNAME: decodeURIComponent(url.username),
      DB_PASSWORD: decodeURIComponent(url.password),
      DB_NAME: decodeURIComponent(url.pathname.slice(1)),
    };
  } catch {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_URL'],
      message: "n'est pas une URL valide",
    });
    return;
  }

  const expected: typeof parts = {
    DB_HOST: env.DB_HOST.toLowerCase(),
    DB_PORT: String(env.DB_PORT),
    DB_USERNAME: env.DB_USERNAME,
    DB_PASSWORD: env.DB_PASSWORD,
    DB_NAME: env.DB_NAME,
  };

  for (const key of Object.keys(expected) as (keyof typeof parts)[]) {
    if (parts[key] !== expected[key]) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: `ne correspond pas à ${key}`,
      });
    }
  }
}

export const DEFAULT_GARMIN_PERSONAL_API_BASE_URL =
  'https://personal.connectapi.garmin.com';

export const garminEnvSchema = z.object({
  GARMIN_PERSONAL_API_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().optional(),
  ),
  GARMIN_PERSONAL_API_BASE_URL: z
    .url()
    .default(DEFAULT_GARMIN_PERSONAL_API_BASE_URL),
});

export const databaseEnvSchema = databaseEnvShape.superRefine(checkDatabaseUrl);

export const envSchema = appEnvSchema
  .extend(garminEnvSchema.shape)
  .extend(databaseEnvShape.shape)
  .superRefine(checkDatabaseUrl);

export type Env = z.infer<typeof envSchema>;

export function parseEnv<T extends z.ZodType>(
  schema: T,
  raw: Record<string, unknown>,
): z.output<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Configuration invalide :\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  return parseEnv(envSchema, raw);
}
