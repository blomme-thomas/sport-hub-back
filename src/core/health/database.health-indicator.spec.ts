import { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { DatabaseHealthIndicator } from './database.health-indicator.js';

function indicatorWith(queryRaw: () => Promise<unknown>) {
  const prisma = { $queryRaw: vi.fn(queryRaw) };
  return {
    indicator: new DatabaseHealthIndicator(prisma as unknown as PrismaService),
    prisma,
  };
}

describe('DatabaseHealthIndicator', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renvoie up quand la requête réussit, sans log', async () => {
    const { indicator, prisma } = indicatorWith(() =>
      Promise.resolve([{ '?column?': 1 }]),
    );

    await expect(indicator.check()).resolves.toBe('up');

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('renvoie down (sans lever) quand la requête échoue', async () => {
    const { indicator } = indicatorWith(() =>
      Promise.reject(new Error('connect ECONNREFUSED')),
    );

    await expect(indicator.check()).resolves.toBe('down');
  });

  it('logue un warn avec le seul code d erreur filtré, sans message brut ni stack', async () => {
    const error = Object.assign(
      new Error('password authentication failed for postgresql://u:pw@h/db'),
      { code: 'ECONNREFUSED' },
    );
    const { indicator } = indicatorWith(() => Promise.reject(error));

    await indicator.check();

    expect(warn).toHaveBeenCalledTimes(1);
    const logged = (warn.mock.calls[0] as unknown[]).map(String).join('\n');
    expect(logged).toContain('ECONNREFUSED');
    expect(logged).not.toContain('postgresql://');
    expect(logged).not.toContain('password');
    expect(logged).not.toContain(error.stack ?? 'no-stack');
  });

  it('logue un warn même sans code d erreur exploitable', async () => {
    const { indicator } = indicatorWith(() =>
      Promise.reject(new Error('secret interne')),
    );

    await expect(indicator.check()).resolves.toBe('down');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret interne');
  });

  it('se comporte de même sur un rejet qui n est pas une Error', async () => {
    const { indicator } = indicatorWith(() => Promise.reject('texte brut'));

    await expect(indicator.check()).resolves.toBe('down');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('texte brut');
  });
});
