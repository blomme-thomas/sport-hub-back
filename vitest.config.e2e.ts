import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './test/support/test-database.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    fileParallelism: false,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/support/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      APP_LOG_LEVEL: 'error',
      DB_NAME: 'sporthub_test',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'sporthub',
      DB_PASSWORD: 'sporthub',
      DATABASE_URL: TEST_DATABASE_URL,
      GARMIN_SYNC_CRON_ENABLED: 'false',
    },
  },
});
