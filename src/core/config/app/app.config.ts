import { registerAs, type ConfigType } from '@nestjs/config';
import { LOG_LEVEL_VALUES, appEnvSchema, parseEnv } from '../env.validation.js';

export const APP_CONFIG_KEY = 'app';

const appConfig = registerAs(APP_CONFIG_KEY, () => {
  const env = parseEnv(appEnvSchema, process.env);

  return {
    name: env.APP_NAME,
    host: env.APP_HOST,
    port: env.APP_PORT,
    globalPrefix: env.APP_GLOBAL_PREFIX,
    env: env.NODE_ENV,
    logLevel: env.APP_LOG_LEVEL,
    logLevels: LOG_LEVEL_VALUES.slice(
      LOG_LEVEL_VALUES.indexOf(env.APP_LOG_LEVEL),
    ),
    corsOrigin: env.APP_CORS_ORIGIN,
  };
});

export default appConfig;
export type AppConfig = ConfigType<typeof appConfig>;
