import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import databaseConfig, {
  type DatabaseConfig,
} from '../config/database/database.config.js';
import { PrismaClient } from './generated/client.js';

/**
 * Client Prisma partagé. Aucune connexion au démarrage : Prisma se connecte à la
 * première requête, donc l'application (et /api/health) démarre même sans base.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(databaseConfig.KEY) config: DatabaseConfig) {
    super({ adapter: new PrismaPg({ connectionString: config.url }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
