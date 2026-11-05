import { registerAs, type ConfigType } from '@nestjs/config';
import { databaseEnvSchema, parseEnv } from '../env.validation.js';

export const DATABASE_CONFIG_KEY = 'database';

const databaseConfig = registerAs(DATABASE_CONFIG_KEY, () => {
  const env = parseEnv(databaseEnvSchema, process.env);

  return {
    name: env.DB_NAME,
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    url: env.DATABASE_URL,
  };
});

export default databaseConfig;
export type DatabaseConfig = ConfigType<typeof databaseConfig>;
