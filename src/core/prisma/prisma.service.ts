import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import databaseConfig, {
  type DatabaseConfig,
} from '../config/database/database.config.js';
import {
  DatabaseUnavailableError,
  safeErrorCode,
} from './database-unavailable.error.js';
import { PrismaClient } from './generated/client.js';

const CONNECTION_TIMEOUT_MS = 5_000;

/**
 * Client Prisma partagé. Au démarrage (`onModuleInit`), vérifie la base (`$connect`
 * puis `SELECT 1`) et lève `DatabaseUnavailableError` (sans secret) si elle ne répond
 * pas : l'application s'arrête plutôt que de démarrer sans base.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly target: { host: string; port: number; name: string };

  constructor(@Inject(databaseConfig.KEY) config: DatabaseConfig) {
    super({
      adapter: new PrismaPg({
        connectionString: config.url,
        connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      }),
    });
    this.target = { host: config.host, port: config.port, name: config.name };
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      await this.$disconnect().catch(() => undefined);
      throw new DatabaseUnavailableError(this.target, safeErrorCode(error));
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
