import { describe, expect, it } from 'vitest';
import { ActivityNotFoundError } from '../../domain/errors/activity-not-found.error.js';
import type {
  ActivityDetailItem,
  IActivityListReadModel,
} from '../../domain/ports/outbound/activity-list.read-model.port.js';
import { GetActivityDetailUseCase } from './get-activity-detail.use-case.js';

const DETAIL: ActivityDetailItem = {
  id: '3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f',
  garminActivityId: '12345678901',
  type: 'running',
  startedAt: new Date('2026-05-01T06:30:00.000Z'),
  durationSeconds: 3600,
  distanceMeters: 10000,
  calories: 650,
  elevationGainMeters: 120,
  averageHeartRate: 145,
  maxHeartRate: 172,
  hrTimeInZone: [600, 1200, 1500, 300, null],
  heartRateSeries: null,
};

function readModel(
  findDetailById: (id: string) => Promise<ActivityDetailItem | null>,
): IActivityListReadModel {
  return {
    list: async () => ({ items: [], total: 0 }),
    findById: async () => null,
    findDetailById,
  };
}

describe('GetActivityDetailUseCase', () => {
  it('renvoie le détail de l’activité portant cet identifiant', async () => {
    const useCase = new GetActivityDetailUseCase(readModel(async () => DETAIL));

    await expect(useCase.execute(DETAIL.id)).resolves.toEqual(DETAIL);
  });

  it('lève ActivityNotFoundError quand l’activité n’est pas enregistrée', async () => {
    const useCase = new GetActivityDetailUseCase(readModel(async () => null));

    await expect(useCase.execute('absente')).rejects.toThrow(
      ActivityNotFoundError,
    );
  });
});
