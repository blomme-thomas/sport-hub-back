import { Test } from '@nestjs/testing';
import { Activity } from '../../domain/entities/activity.entity.js';
import { GarminAccessDeniedError } from '../../domain/errors/garmin-access-denied.error.js';
import { GarminUnavailableError } from '../../domain/errors/garmin-unavailable.error.js';
import {
  ACTIVITY_REPOSITORY,
  type IActivityRepository,
} from '../../domain/ports/outbound/activity.repository.port.js';
import {
  GARMIN_CONNECT_CLIENT,
  type DailyCaloriesDay,
  type HeartRateZonesConfig,
  type IGarminConnectClient,
  type RecoveryDay,
} from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { ACTIVITY_HEART_RATE_EXTRACTOR } from '../../domain/ports/outbound/activity-heart-rate.extractor.port.js';
import {
  DISCIPLINE_REGISTRY,
  type IDisciplineRegistry,
} from '../../domain/ports/outbound/discipline-registry.port.js';
import { GarminActivityId } from '../../domain/value-objects/garmin-activity-id.vo.js';
import { SyncGarminActivitiesUseCase } from './sync-garmin-activities.use-case.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function activity(id: string, overrides: Record<string, unknown> = {}) {
  return Activity.create({
    garminActivityId: GarminActivityId.create(id),
    type: 'running',
    startedAt: new Date('2026-05-01T06:30:00.000Z'),
    durationSeconds: 3600,
    distanceMeters: 10000 as number | null,
    sourcePayload: { activityId: id, name: 'initial' } as unknown,
    ...overrides,
  });
}

class InMemoryActivityRepository implements IActivityRepository {
  readonly store = new Map<string, Activity>();
  saveCalls: Activity[][] = [];

  findLatestStartedAt(): Promise<Date | null> {
    const dates = [...this.store.values()].map((a) => a.startedAt.getTime());
    return Promise.resolve(
      dates.length === 0 ? null : new Date(Math.max(...dates)),
    );
  }

  findByGarminActivityIds(ids: GarminActivityId[]): Promise<Activity[]> {
    return Promise.resolve(
      ids
        .map((id) => this.store.get(id.toString()))
        .filter((a): a is Activity => a !== undefined),
    );
  }

  readonly samples = new Map<string, unknown[]>();

  saveFitExtraction(
    garminActivityId: string,
    extraction: { heartRateSamples: unknown[] },
  ): Promise<void> {
    this.samples.set(garminActivityId, extraction.heartRateSamples);
    return Promise.resolve();
  }

  save(activities: Activity[]): Promise<void> {
    this.saveCalls.push(activities);
    for (const a of activities) {
      this.store.set(a.garminActivityId.toString(), a);
    }
    return Promise.resolve();
  }
}

class FakeGarminClient implements IGarminConnectClient {
  remote: Activity[] = [];
  sinceCalls: Array<Date | null> = [];
  failure?: Error;

  fetchActivitiesSince(since: Date | null): Promise<Activity[]> {
    this.sinceCalls.push(since);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    return Promise.resolve(this.remote);
  }

  fetchDisplayName(): Promise<string | null> {
    return Promise.resolve(null);
  }

  fetchHeartRateZones(): Promise<HeartRateZonesConfig | null> {
    return Promise.resolve(null);
  }

  fetchRecoveryDays(): Promise<RecoveryDay[]> {
    return Promise.resolve([]);
  }

  fetchDailyCalories(): Promise<DailyCaloriesDay[]> {
    return Promise.resolve([]);
  }

  fetchActivityFile(garminActivityId: string): Promise<Uint8Array> {
    return Promise.resolve(new TextEncoder().encode(garminActivityId));
  }
}

class FakeDisciplineRegistry implements IDisciplineRegistry {
  calls: string[][] = [];
  failure?: Error;

  recordAppearances(typeKeys: string[]): Promise<void> {
    this.calls.push(typeKeys);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    return Promise.resolve();
  }
}

describe('SyncGarminActivitiesUseCase', () => {
  let useCase: SyncGarminActivitiesUseCase;
  let repository: InMemoryActivityRepository;
  let garmin: FakeGarminClient;
  let registry: FakeDisciplineRegistry;

  beforeEach(async () => {
    repository = new InMemoryActivityRepository();
    garmin = new FakeGarminClient();
    registry = new FakeDisciplineRegistry();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncGarminActivitiesUseCase,
        { provide: ACTIVITY_REPOSITORY, useValue: repository },
        { provide: GARMIN_CONNECT_CLIENT, useValue: garmin },
        { provide: DISCIPLINE_REGISTRY, useValue: registry },
        {
          provide: ACTIVITY_HEART_RATE_EXTRACTOR,
          useValue: {
            extract: () => ({
              heartRateSamples: [],
              document: {
                formatVersion: 1,
                session: null,
                laps: [],
                timeInZone: [],
                records: [],
              },
            }),
          },
        },
      ],
    }).compile();
    useCase = moduleRef.get(SyncGarminActivitiesUseCase);
  });

  describe('première synchronisation', () => {
    it('enregistre toutes les activités Garmin comme créées', async () => {
      garmin.remote = [activity('1'), activity('2'), activity('3')];

      const result = await useCase.execute();

      expect(result).toEqual({ created: 3, updated: 0, ignored: 0 });
      expect([...repository.store.keys()].sort()).toEqual(['1', '2', '3']);
    });

    it("demande à Garmin tout l'historique quand aucune activité n'est connue", async () => {
      await useCase.execute();

      expect(garmin.sinceCalls).toEqual([null]);
    });

    it('renvoie un résumé vide quand Garmin ne renvoie rien', async () => {
      const result = await useCase.execute();

      expect(result).toEqual({ created: 0, updated: 0, ignored: 0 });
      expect(repository.store.size).toBe(0);
    });
  });

  describe('reprise', () => {
    it('reprend sept jours avant la dernière activité connue', async () => {
      const latest = new Date('2026-05-20T10:00:00.000Z');
      repository.store.set(
        '1',
        activity('1', { startedAt: new Date('2026-05-10T10:00:00.000Z') }),
      );
      repository.store.set('2', activity('2', { startedAt: latest }));

      await useCase.execute();

      expect(garmin.sinceCalls).toEqual([
        new Date(latest.getTime() - 7 * DAY_MS),
      ]);
    });
  });

  describe('idempotence', () => {
    it('ne crée aucun doublon en rejouant la synchronisation', async () => {
      garmin.remote = [activity('1'), activity('2')];

      await useCase.execute();
      const second = await useCase.execute();

      expect(second).toEqual({ created: 0, updated: 0, ignored: 2 });
      expect(repository.store.size).toBe(2);
    });

    it('ignore une activité déjà connue au contenu identique', async () => {
      repository.store.set('1', activity('1'));
      garmin.remote = [activity('1')];

      const result = await useCase.execute();

      expect(result).toEqual({ created: 0, updated: 0, ignored: 1 });
    });

    it("n'enregistre pas les activités ignorées", async () => {
      repository.store.set('1', activity('1'));
      garmin.remote = [activity('1'), activity('2')];

      await useCase.execute();

      const saved = repository.saveCalls
        .flat()
        .map((a) => a.garminActivityId.toString());
      expect(saved).toEqual(['2']);
    });
  });

  describe('mise à jour', () => {
    it('met à jour une activité déjà connue que Garmin a modifiée', async () => {
      repository.store.set('1', activity('1'));
      garmin.remote = [
        activity('1', { sourcePayload: { activityId: '1', name: 'renommée' } }),
      ];

      const result = await useCase.execute();

      expect(result).toEqual({ created: 0, updated: 1, ignored: 0 });
      expect(repository.store.get('1')?.sourcePayload).toEqual({
        activityId: '1',
        name: 'renommée',
      });
      expect(repository.store.size).toBe(1);
    });

    it('classe séparément créées, mises à jour et ignorées', async () => {
      repository.store.set('1', activity('1'));
      repository.store.set('2', activity('2'));
      garmin.remote = [
        activity('1'),
        activity('2', { sourcePayload: { activityId: '2', name: 'modifiée' } }),
        activity('3'),
        activity('4'),
      ];

      const result = await useCase.execute();

      expect(result).toEqual({ created: 2, updated: 1, ignored: 1 });
    });
  });

  describe('doublons dans la réponse Garmin', () => {
    it('compte une seule fois un identifiant renvoyé deux fois', async () => {
      garmin.remote = [activity('1'), activity('1')];

      const result = await useCase.execute();

      expect(result).toEqual({ created: 1, updated: 0, ignored: 0 });
      expect(repository.store.size).toBe(1);
    });
  });

  describe('enregistrement des disciplines', () => {
    it('transmet au registre les types distincts de toutes les activités reçues', async () => {
      garmin.remote = [
        activity('1', { type: 'running' }),
        activity('2', { type: 'running' }),
        activity('3', { type: 'cycling' }),
      ];

      await useCase.execute();

      expect(registry.calls).toHaveLength(1);
      expect([...(registry.calls[0] ?? [])].sort()).toEqual([
        'cycling',
        'running',
      ]);
    });

    it('transmet au registre le type d’une activité ignorée', async () => {
      repository.store.set('1', activity('1', { type: 'swimming' }));
      garmin.remote = [activity('1', { type: 'swimming' })];

      const result = await useCase.execute();

      expect(result).toEqual({ created: 0, updated: 0, ignored: 1 });
      expect(registry.calls).toEqual([['swimming']]);
    });

    it('transmet au registre les types même quand aucune activité n’est à enregistrer', async () => {
      repository.store.set('1', activity('1', { type: 'swimming' }));
      garmin.remote = [activity('1', { type: 'swimming' })];

      await useCase.execute();

      expect(repository.saveCalls.flat()).toEqual([]);
      expect(registry.calls.flat()).toEqual(['swimming']);
    });

    it('propage l’échec du registre sans enregistrer d’activité', async () => {
      registry.failure = new Error('référentiel indisponible');
      garmin.remote = [activity('1'), activity('2')];

      await expect(useCase.execute()).rejects.toThrow(
        'référentiel indisponible',
      );
      expect(repository.saveCalls).toEqual([]);
      expect(repository.store.size).toBe(0);
    });
  });

  describe('erreurs', () => {
    it("propage l'accès refusé sans rien enregistrer", async () => {
      garmin.failure = new GarminAccessDeniedError();

      await expect(useCase.execute()).rejects.toBeInstanceOf(
        GarminAccessDeniedError,
      );
      expect(repository.store.size).toBe(0);
    });

    it("propage l'indisponibilité de Garmin sans rien enregistrer", async () => {
      garmin.failure = new GarminUnavailableError();

      await expect(useCase.execute()).rejects.toBeInstanceOf(
        GarminUnavailableError,
      );
      expect(repository.store.size).toBe(0);
    });
  });
});
