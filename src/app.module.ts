import { Module } from '@nestjs/common';
import { AppConfigModule } from './core/config/app-config.module.js';
import { HealthModule } from './core/health/health.module.js';
import { PrismaModule } from './core/prisma/prisma.module.js';

@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule],
})
export class AppModule {}
