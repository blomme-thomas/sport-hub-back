import { Module } from '@nestjs/common';
import { DatabaseHealthIndicator } from './database.health-indicator.js';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator],
})
export class HealthModule {}
