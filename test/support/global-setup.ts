import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-database.js';

export default function setup(): void {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
