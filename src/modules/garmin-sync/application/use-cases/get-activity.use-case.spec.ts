import { describe, expect, it, vi } from 'vitest';
import { GetActivityUseCase } from './get-activity.use-case.js';

describe('GetActivityUseCase', () => {
  it('renvoie l’activité portant cet identifiant', async () => {
    const findById = vi.fn().mockResolvedValue({
      id: 'a1',
      garminActivityId: 'g1',
      type: 'running',
      startedAt: new Date('2026-11-12T08:00:00.000Z'),
      durationSeconds: 2700,
      distanceMeters: 8000,
    });

    const result = await new GetActivityUseCase({
      list: vi.fn(),
      findById,
    }).execute('a1');

    expect(findById).toHaveBeenCalledWith('a1');
    expect(result).toMatchObject({ id: 'a1', type: 'running' });
  });

  it('renvoie null pour une activité inconnue', async () => {
    const findById = vi.fn().mockResolvedValue(null);

    await expect(
      new GetActivityUseCase({ list: vi.fn(), findById }).execute('inconnue'),
    ).resolves.toBeNull();
  });
});
