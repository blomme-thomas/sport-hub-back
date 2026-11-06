import { Logger } from '@nestjs/common';
import { DatabaseUnavailableError } from './database-unavailable.error.js';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  const config = {
    name: 'sporthub',
    host: 'localhost',
    port: 5432,
    username: 'sporthub',
    password: 'sporthub',
    url: 'postgresql://sporthub:sporthub@localhost:5432/sporthub',
  };

  // Port 1 : refus de connexion immédiat. Mot de passe factice pour vérifier l'absence de fuite.
  const unreachable = {
    name: 'sporthub_unreachable',
    host: '127.0.0.1',
    port: 1,
    username: 'fake_user',
    password: 'fake-secret-pw',
    url: 'postgresql://fake_user:fake-secret-pw@127.0.0.1:1/sporthub_unreachable',
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('se construit sans ouvrir de connexion', () => {
    // Pas de toBeInstanceOf : le client Prisma est un Proxy, que l'assertion ne sait pas inspecter.
    expect(() => new PrismaService(config)).not.toThrow();
  });

  it('se déconnecte proprement même sans connexion ouverte', async () => {
    await expect(
      new PrismaService(config).onModuleDestroy(),
    ).resolves.toBeUndefined();
  });

  describe('onModuleInit', () => {
    it('se connecte puis exécute SELECT 1', async () => {
      const service = new PrismaService(config);
      const order: string[] = [];
      vi.spyOn(service, '$connect').mockImplementation(() => {
        order.push('connect');
        return Promise.resolve();
      });
      const queryRaw = vi
        .spyOn(service, '$queryRaw')
        .mockImplementation((() => {
          order.push('query');
          return Promise.resolve([{ '?column?': 1 }]);
        }) as never);
      const disconnect = vi
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);

      await expect(service.onModuleInit()).resolves.toBeUndefined();

      expect(order).toEqual(['connect', 'query']);
      expect(queryRaw).toHaveBeenCalledTimes(1);
      expect(disconnect).not.toHaveBeenCalled();
    });

    it('lève DatabaseUnavailableError et se déconnecte si $connect échoue', async () => {
      const service = new PrismaService(config);
      vi.spyOn(service, '$connect').mockRejectedValue(
        Object.assign(new Error('connect ECONNREFUSED secret-detail'), {
          code: 'ECONNREFUSED',
        }),
      );
      const queryRaw = vi.spyOn(service, '$queryRaw');
      const disconnect = vi
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);

      const error = await service.onModuleInit().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseUnavailableError);
      const { message, cause } = error as Error;
      expect(message).toContain('localhost');
      expect(message).toContain('5432');
      expect(message).toContain('sporthub');
      expect(message).toContain('ECONNREFUSED');
      expect(message).not.toContain('secret-detail');
      expect(cause).toBeUndefined();
      expect(queryRaw).not.toHaveBeenCalled();
      expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('lève DatabaseUnavailableError si SELECT 1 échoue, et se déconnecte', async () => {
      const service = new PrismaService(config);
      vi.spyOn(service, '$connect').mockResolvedValue(undefined);
      vi.spyOn(service, '$queryRaw').mockImplementation((() =>
        Promise.reject(new Error('query failed'))) as never);
      const disconnect = vi
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);

      await expect(service.onModuleInit()).rejects.toBeInstanceOf(
        DatabaseUnavailableError,
      );
      expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('lève quand même DatabaseUnavailableError si $disconnect échoue (best effort)', async () => {
      const service = new PrismaService(config);
      vi.spyOn(service, '$connect').mockRejectedValue(new Error('down'));
      vi.spyOn(service, '$disconnect').mockRejectedValue(
        new Error('disconnect failed'),
      );

      await expect(service.onModuleInit()).rejects.toBeInstanceOf(
        DatabaseUnavailableError,
      );
    });

    it('échoue sans fuite sur une base injoignable (127.0.0.1:1)', async () => {
      vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const service = new PrismaService(unreachable);

      const error = await service.onModuleInit().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseUnavailableError);
      const { message, cause } = error as Error;
      expect(message).toContain('127.0.0.1');
      expect(message).toContain('sporthub_unreachable');
      expect(message).not.toContain('fake-secret-pw');
      expect(message).not.toContain('fake_user');
      expect(message).not.toContain('postgresql://');
      expect(cause).toBeUndefined();
      expect(JSON.stringify(error)).not.toContain('fake-secret-pw');

      await service.onModuleDestroy();
    }, 15_000);
  });
});
