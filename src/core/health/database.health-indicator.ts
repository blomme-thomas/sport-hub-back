import { Injectable, Logger } from '@nestjs/common';
import type { DependencyStatus } from '../filters/problem-details.js';
import { safeErrorCode } from '../prisma/database-unavailable.error.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DatabaseHealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      const code = safeErrorCode(error);
      this.logger.warn(
        `Base de données indisponible${code ? ` (${code})` : ''}.`,
      );
      return 'down';
    }
  }
}
