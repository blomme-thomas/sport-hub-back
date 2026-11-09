import { Test } from '@nestjs/testing';
import { Activity } from '../../domain/entities/activity.entity.js';
import { GarminUnavailableError } from '../../domain/errors/garmin-unavailable.error.js';
import { GarminActivityFileInvalidError } from '../../domain/errors/garmin-activity-file-invalid.error.js';
import { ACTIVITY_REPOSITORY } from '../../domain/ports/outbound/activity.repository.port.js';
import {
  ACTIVITY_HEART_RATE_EXTRACTOR,
  type HeartRateSample,
} from '../../domain/ports/outbound/activity-heart-rate.extractor.port.js';
import { GARMIN_CONNECT_CLIENT } from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { DISCIPLINE_REGISTRY } from '../../domain/ports/outbound/discipline-registry.port.js';
import { GarminActivityId } from '../../domain/value-objects/garmin-activity-id.vo.js';
import { SyncGarminActivitiesUseCase } from './sync-garmin-activities.use-case.js';

const T0 = new Date('2026-11-08T08:44:19.000Z');

function activity(id: string) {
  return Activity.create({
    garminActivityId: GarminActivityId.create(id),
    type: 'running',
    startedAt: new Date('2026-05-01T06:30:00.000Z'),
    durationSeconds: 3600,
    distanceMeters: 10000,
    sourcePayload: { activityId: id },
  });
}

describe('SyncGarminActivitiesUseCase : série de fréquence cardiaque', () => {
  let useCase: SyncGarminActivitiesUseCase;
  const samplesById = new Map<string, HeartRateSample[]>();
  const stored = new Map<string, HeartRateSample[]>();
  const downloads: string[] = [];
  let remote: Activity[];
  let failingDownloads: Set<string>;
  let corruptFiles: Set<string>;
  let known: Activity[];

  beforeEach(async () => {
    samplesById.clear();
    stored.clear();
    downloads.length = 0;
    failingDownloads = new Set();
    corruptFiles = new Set();
    known = [];
    remote = [];
    const repository = {
      findLatestStartedAt: async () => null,
      findByGarminActivityIds: async (ids: GarminActivityId[]) =>
        known.filter((a) =>
          ids.some((id) => id.toString() === a.garminActivityId.toString()),
        ),
      save: async () => undefined,
      saveHeartRateSamples: async (id: string, samples: HeartRateSample[]) => {
        stored.set(id, samples);
      },
    };
    const garmin = {
      fetchActivitiesSince: async () => remote,
      fetchActivityFile: async (id: string) => {
        downloads.push(id);
        if (failingDownloads.has(id)) {
          throw new GarminUnavailableError();
        }
        return new TextEncoder().encode(id);
      },
    };
    const extractor = {
      extract: (file: Uint8Array): HeartRateSample[] => {
        const id = new TextDecoder().decode(file);
        if (corruptFiles.has(id)) {
          throw new GarminActivityFileInvalidError();
        }
        return samplesById.get(id) ?? [{ occurredAt: T0, bpm: 110 }];
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncGarminActivitiesUseCase,
        { provide: ACTIVITY_REPOSITORY, useValue: repository },
        { provide: GARMIN_CONNECT_CLIENT, useValue: garmin },
        {
          provide: DISCIPLINE_REGISTRY,
          useValue: { recordAppearances: async () => undefined },
        },
        { provide: ACTIVITY_HEART_RATE_EXTRACTOR, useValue: extractor },
      ],
    }).compile();
    useCase = moduleRef.get(SyncGarminActivitiesUseCase);
  });

  it('télécharge puis enregistre la série de chaque activité nouvelle', async () => {
    remote = [activity('1'), activity('2')];
    samplesById.set('1', [{ occurredAt: T0, bpm: 120 }]);

    await useCase.execute();

    expect(downloads.sort()).toEqual(['1', '2']);
    expect(stored.get('1')).toEqual([{ occurredAt: T0, bpm: 120 }]);
    expect(stored.get('2')).toEqual([{ occurredAt: T0, bpm: 110 }]);
  });

  it('ne retélécharge pas le fichier d’une activité déjà connue', async () => {
    known = [activity('1')];
    remote = [activity('1'), activity('2')];

    await useCase.execute();

    expect(downloads).toEqual(['2']);
    expect([...stored.keys()]).toEqual(['2']);
  });

  it('garde la synchronisation quand le téléchargement d’une activité échoue', async () => {
    remote = [activity('1'), activity('2')];
    failingDownloads.add('1');

    const result = await useCase.execute();

    expect(result).toEqual({ created: 2, updated: 0, ignored: 0 });
    expect([...stored.keys()]).toEqual(['2']);
  });

  it('garde la synchronisation quand un fichier est illisible', async () => {
    remote = [activity('1'), activity('2')];
    corruptFiles.add('1');

    const result = await useCase.execute();

    expect(result).toEqual({ created: 2, updated: 0, ignored: 0 });
    expect([...stored.keys()]).toEqual(['2']);
  });
});
