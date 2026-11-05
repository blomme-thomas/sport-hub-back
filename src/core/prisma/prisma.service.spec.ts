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

  it('se construit sans ouvrir de connexion', () => {
    // Pas de toBeInstanceOf : le client Prisma est un Proxy, que l'assertion ne sait pas inspecter.
    expect(() => new PrismaService(config)).not.toThrow();
  });

  it('se déconnecte proprement même sans connexion ouverte', async () => {
    await expect(
      new PrismaService(config).onModuleDestroy(),
    ).resolves.toBeUndefined();
  });
});
