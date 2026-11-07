import { Logger } from '@nestjs/common';
import type { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import type { GarminConfig } from '../../../../core/config/garmin/garmin.config.js';
import type { SyncGarminActivitiesResultDto } from '../../application/dtos/sync-garmin-activities-result.dto.js';
import type { SyncGarminActivitiesUseCase } from '../../application/use-cases/sync-garmin-activities.use-case.js';
import { GarminUnavailableError } from '../../domain/errors/garmin-unavailable.error.js';
import { GarminSyncScheduler } from './garmin-sync.scheduler.js';

vi.mock('cron', async (importOriginal) => ({
  ...(await importOriginal<typeof import('cron')>()),
  CronJob: { from: vi.fn() },
}));

const JOB_NAME = 'garmin-sync';
const CRON_EXPRESSION = '0 */3 * * *';
const SUMMARY: SyncGarminActivitiesResultDto = {
  created: 3,
  updated: 1,
  ignored: 2,
};

class FakeSchedulerRegistry {
  readonly jobs = new Map<string, { stop: () => void }>();

  addCronJob(name: string, job: { stop: () => void }): void {
    if (this.jobs.has(name)) {
      throw new Error(`Duplicate Cron Job (${name})`);
    }
    this.jobs.set(name, job);
  }

  deleteCronJob(name: string): void {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`No Cron Job was found with the given name (${name})`);
    }
    job.stop();
    this.jobs.delete(name);
  }
}

function config(overrides: Partial<GarminConfig> = {}): GarminConfig {
  return {
    personalApiKey: 'cle-garmin',
    personalApiBaseUrl: 'https://garmin.test',
    syncCronEnabled: true,
    syncCronExpression: CRON_EXPRESSION,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function messagesOf(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.map((args) => JSON.stringify(args)).join('\n');
}

describe('GarminSyncScheduler', () => {
  let useCase: { execute: ReturnType<typeof vi.fn> };
  let registry: FakeSchedulerRegistry;
  let job: { stop: () => void };
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  function createScheduler(overrides: Partial<GarminConfig> = {}) {
    return new GarminSyncScheduler(
      useCase as unknown as SyncGarminActivitiesUseCase,
      config(overrides),
      registry as unknown as SchedulerRegistry,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useCase = { execute: vi.fn().mockResolvedValue(SUMMARY) };
    registry = new FakeSchedulerRegistry();
    job = { stop: vi.fn() };
    vi.mocked(CronJob.from).mockReturnValue(job as unknown as CronJob);
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('démarrage', () => {
    it('ne planifie aucun job quand la synchronisation planifiée est désactivée', () => {
      const scheduler = createScheduler({ syncCronEnabled: false });

      scheduler.onApplicationBootstrap();

      expect(CronJob.from).not.toHaveBeenCalled();
      expect(registry.jobs.size).toBe(0);
    });

    it("planifie la synchronisation avec l'expression configurée", () => {
      const scheduler = createScheduler();

      scheduler.onApplicationBootstrap();

      expect(CronJob.from).toHaveBeenCalledTimes(1);
      expect(CronJob.from).toHaveBeenCalledWith(
        expect.objectContaining({
          cronTime: CRON_EXPRESSION,
          start: true,
        }),
      );
      expect(registry.jobs.get(JOB_NAME)).toBe(job);
    });

    it('déclenche une exécution de la synchronisation à chaque tick du job', () => {
      const scheduler = createScheduler();
      scheduler.onApplicationBootstrap();
      const options = vi.mocked(CronJob.from).mock.calls[0][0];
      const onTick = options.onTick as () => void;

      onTick();

      expect(useCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('exécution planifiée', () => {
    it('exécute la synchronisation une fois et logue le résumé', async () => {
      const scheduler = createScheduler();

      await scheduler.runScheduledSync();

      expect(useCase.execute).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalled();
      expect(messagesOf(logSpy)).toMatch(/3.*1.*2/);
    });

    it('ignore un déclenchement pendant qu une exécution est en cours', async () => {
      const pending = deferred<SyncGarminActivitiesResultDto>();
      useCase.execute.mockReturnValueOnce(pending.promise);
      const scheduler = createScheduler();

      const first = scheduler.runScheduledSync();
      await scheduler.runScheduledSync();

      expect(useCase.execute).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);

      pending.resolve(SUMMARY);
      await first;
    });

    it('relance la synchronisation une fois l exécution précédente terminée', async () => {
      const pending = deferred<SyncGarminActivitiesResultDto>();
      useCase.execute.mockReturnValueOnce(pending.promise);
      const scheduler = createScheduler();

      const first = scheduler.runScheduledSync();
      await scheduler.runScheduledSync();
      pending.resolve(SUMMARY);
      await first;
      await scheduler.runScheduledSync();

      expect(useCase.execute).toHaveBeenCalledTimes(2);
    });

    it('logue une erreur métier sans la relancer et permet l exécution suivante', async () => {
      useCase.execute.mockRejectedValueOnce(new GarminUnavailableError());
      const scheduler = createScheduler();

      await expect(scheduler.runScheduledSync()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalled();
      expect(messagesOf(errorSpy)).toContain('GarminUnavailableError');
      expect(messagesOf(errorSpy)).toContain('GARMIN_UNAVAILABLE');

      useCase.execute.mockResolvedValueOnce(SUMMARY);
      await scheduler.runScheduledSync();

      expect(useCase.execute).toHaveBeenCalledTimes(2);
    });

    it('logue une erreur technique sans exposer son message ni sa pile', async () => {
      useCase.execute.mockRejectedValueOnce(new Error('secret-interne-42'));
      const scheduler = createScheduler();

      await expect(scheduler.runScheduledSync()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalled();
      expect(messagesOf(errorSpy)).not.toContain('secret-interne-42');
    });

    it('libère le verrou après une erreur technique', async () => {
      useCase.execute.mockRejectedValueOnce(new Error('panne'));
      const scheduler = createScheduler();

      await scheduler.runScheduledSync();
      await scheduler.runScheduledSync();

      expect(useCase.execute).toHaveBeenCalledTimes(2);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('arrêt', () => {
    it("arrête et retire le job planifié à l'arrêt de l'application", () => {
      const scheduler = createScheduler();
      scheduler.onApplicationBootstrap();

      scheduler.onApplicationShutdown();

      expect(job.stop).toHaveBeenCalledTimes(1);
      expect(registry.jobs.has(JOB_NAME)).toBe(false);
    });

    it("ne lève pas d'erreur à l'arrêt quand aucun job n'a été planifié", () => {
      const scheduler = createScheduler({ syncCronEnabled: false });
      scheduler.onApplicationBootstrap();

      expect(() => scheduler.onApplicationShutdown()).not.toThrow();
    });
  });
});
