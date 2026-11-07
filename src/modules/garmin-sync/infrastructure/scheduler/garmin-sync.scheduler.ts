import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  garminConfig,
  type GarminConfig,
} from '../../../../core/config/index.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { SyncGarminActivitiesUseCase } from '../../application/use-cases/sync-garmin-activities.use-case.js';

const JOB_NAME = 'garmin-sync';

@Injectable()
export class GarminSyncScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(GarminSyncScheduler.name);
  private running = false;
  private job?: CronJob;

  constructor(
    private readonly syncGarminActivities: SyncGarminActivitiesUseCase,
    @Inject(garminConfig.KEY) private readonly config: GarminConfig,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.syncCronEnabled) {
      this.logger.log('Synchronisation Garmin planifiée désactivée');
      return;
    }

    this.job = CronJob.from({
      cronTime: this.config.syncCronExpression,
      onTick: () => void this.runScheduledSync(),
      start: true,
    });
    this.schedulerRegistry.addCronJob(JOB_NAME, this.job);
    this.logger.log(
      `Synchronisation Garmin planifiée (expression « ${this.config.syncCronExpression} »)`,
    );
  }

  onApplicationShutdown(): void {
    if (!this.job) {
      return;
    }
    this.schedulerRegistry.deleteCronJob(JOB_NAME);
    this.job = undefined;
  }

  /**
   * Lance une synchronisation Garmin et logue son résumé ou son échec ; ne relance jamais l'erreur pour que les exécutions suivantes restent possibles.
   * Un déclenchement reçu pendant une exécution en cours est ignoré (verrou en mémoire, processus unique).
   */
  async runScheduledSync(): Promise<void> {
    if (this.running) {
      this.logger.warn(
        'Synchronisation Garmin planifiée : exécution précédente en cours, exécution ignorée',
      );
      return;
    }

    this.running = true;
    const startedAt = Date.now();
    try {
      const { created, updated, ignored } =
        await this.syncGarminActivities.execute();
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `Synchronisation Garmin planifiée terminée : ${created} créées, ${updated} mises à jour, ${ignored} ignorées en ${durationMs} ms`,
      );
    } catch (error) {
      this.logger.error(
        `Synchronisation Garmin planifiée en échec : ${this.describe(error)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private describe(error: unknown): string {
    if (error instanceof DomainError) {
      return `${error.name} (${error.code})`;
    }
    return error instanceof Error ? error.name : 'erreur inconnue';
  }
}
