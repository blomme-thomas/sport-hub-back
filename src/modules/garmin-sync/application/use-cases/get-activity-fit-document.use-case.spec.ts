import { describe, expect, it } from 'vitest';
import { ActivityFitDataNotFoundError } from '../../domain/errors/activity-fit-data-not-found.error.js';
import { ActivityNotFoundError } from '../../domain/errors/activity-not-found.error.js';
import type {
  ActivityDetailItem,
  ActivityListItem,
  IActivityListReadModel,
} from '../../domain/ports/outbound/activity-list.read-model.port.js';
import type { ActivityFitDocument } from '../../domain/ports/outbound/activity-heart-rate.extractor.port.js';
import { GetActivityFitDocumentUseCase } from './get-activity-fit-document.use-case.js';

const ITEM: ActivityListItem = {
  id: 'a1',
  garminActivityId: '987',
  type: 'running',
  startedAt: new Date('2026-05-01T06:30:00.000Z'),
  durationSeconds: 3600,
  distanceMeters: 10000,
  averageHeartRate: 145,
};

const DOCUMENT: ActivityFitDocument = {
  formatVersion: 1,
  session: { sport: 'running', avgHeartRate: 145 },
  laps: [],
  timeInZone: [],
  records: [[1793000000, 110]],
};

function readModel(
  findById: (id: string) => Promise<ActivityListItem | null>,
  findFitDocument: (id: string) => Promise<ActivityFitDocument | null>,
): IActivityListReadModel {
  return {
    list: async () => ({ items: [], total: 0 }),
    findById,
    findDetailById: async (): Promise<ActivityDetailItem | null> => null,
    findFitDocument,
  };
}

describe('GetActivityFitDocumentUseCase', () => {
  it('renvoie le document FIT de l’activité', async () => {
    const useCase = new GetActivityFitDocumentUseCase(
      readModel(
        async () => ITEM,
        async () => DOCUMENT,
      ),
    );

    await expect(useCase.execute('a1')).resolves.toEqual(DOCUMENT);
  });

  it('lève ActivityNotFoundError quand l’activité est inconnue', async () => {
    const useCase = new GetActivityFitDocumentUseCase(
      readModel(
        async () => null,
        async () => DOCUMENT,
      ),
    );

    await expect(useCase.execute('absente')).rejects.toThrow(
      ActivityNotFoundError,
    );
  });

  it('lève ActivityFitDataNotFoundError quand l’activité n’a pas de document FIT', async () => {
    const useCase = new GetActivityFitDocumentUseCase(
      readModel(
        async () => ITEM,
        async () => null,
      ),
    );

    await expect(useCase.execute('a1')).rejects.toThrow(
      ActivityFitDataNotFoundError,
    );
  });
});
