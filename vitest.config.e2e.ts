import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Les tests ne dépendent pas du .env de la machine.
    // La base correspond au service PostgreSQL de la CI (ci-develop.yml).
    env: {
      NODE_ENV: 'test',
      APP_LOG_LEVEL: 'error',
      DB_NAME: 'sporthub_test',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'sporthub',
      DB_PASSWORD: 'sporthub',
      DATABASE_URL:
        'postgresql://sporthub:sporthub@localhost:5432/sporthub_test',
    },
  },
});
