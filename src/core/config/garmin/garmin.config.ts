import { registerAs, type ConfigType } from '@nestjs/config';
import { garminEnvSchema, parseEnv } from '../env.validation.js';

export const GARMIN_CONFIG_KEY = 'garmin';

const garminConfig = registerAs(GARMIN_CONFIG_KEY, () => {
  const env = parseEnv(garminEnvSchema, process.env);

  return {
    personalApiKey: env.GARMIN_PERSONAL_API_KEY,
    personalApiBaseUrl: env.GARMIN_PERSONAL_API_BASE_URL,
    syncCronEnabled: env.GARMIN_SYNC_CRON_ENABLED,
    syncCronExpression: env.GARMIN_SYNC_CRON_EXPRESSION,
  };
});

export default garminConfig;
export type GarminConfig = ConfigType<typeof garminConfig>;
