import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Activity } from '../../domain/entities/activity.entity.js';
import {
  ACTIVITY_REPOSITORY,
  type IActivityRepository,
} from '../../domain/ports/outbound/activity.repository.port.js';
import {
  DISCIPLINE_REGISTRY,
  type IDisciplineRegistry,
} from '../../domain/ports/outbound/discipline-registry.port.js';
import {
  ACTIVITY_HEART_RATE_EXTRACTOR,
  type IActivityHeartRateExtractor,
} from '../../domain/ports/outbound/activity-heart-rate.extractor.port.js';
import {
  GARMIN_CONNECT_CLIENT,
  type IGarminConnectClient,
} from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { SyncWindow } from '../../domain/value-objects/sync-window.vo.js';
import type { SyncGarminActivitiesResultDto } from '../dtos/sync-garmin-activities-result.dto.js';

@Injectable()
export class SyncGarminActivitiesUseCase {
  private readonly logger = new Logger(SyncGarminActivitiesUseCase.name);

  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly activities: IActivityRepository,
    @Inject(GARMIN_CONNECT_CLIENT)
    private readonly garmin: IGarminConnectClient,
    @Inject(DISCIPLINE_REGISTRY)
    private readonly disciplines: IDisciplineRegistry,
    @Inject(ACTIVITY_HEART_RATE_EXTRACTOR)
    private readonly heartRateExtractor: IActivityHeartRateExtractor,
  ) {}

  /**
   * Synchronise les activités Garmin depuis la dernière activité connue (avec recouvrement) et renvoie le décompte créées, mises à jour, ignorées.
   * Rejouable sans doublon : une activité est identifiée par son identifiant Garmin et n'est réécrite que si son contenu a changé.
   *
   * @throws GarminAccessDeniedError si Garmin refuse l'accès.
   * @throws GarminUnavailableError si Garmin est indisponible.
   */
  async execute(): Promise<SyncGarminActivitiesResultDto> {
    const latest = await this.activities.findLatestStartedAt();
    const window = SyncWindow.resumingFrom(latest);

    const fetched = await this.garmin.fetchActivitiesSince(window.since);
    const unique = new Map<string, Activity>();
    for (const activity of fetched) {
      unique.set(activity.garminActivityId.toString(), activity);
    }
    const incoming = [...unique.values()];

    const known = await this.activities.findByGarminActivityIds(
      incoming.map((activity) => activity.garminActivityId),
    );
    const knownById = new Map(
      known.map((activity) => [activity.garminActivityId.toString(), activity]),
    );

    const toSave: Activity[] = [];
    let created = 0;
    let updated = 0;
    let ignored = 0;
    for (const activity of incoming) {
      const existing = knownById.get(activity.garminActivityId.toString());
      if (!existing) {
        created += 1;
        toSave.push(activity);
      } else if (existing.hasSameContentAs(activity)) {
        ignored += 1;
      } else {
        updated += 1;
        toSave.push(activity);
      }
    }

    await this.disciplines.recordAppearances([
      ...new Set(incoming.map((activity) => activity.type)),
    ]);

    if (toSave.length > 0) {
      await this.activities.save(toSave);
    }
    for (const activity of toSave.filter(
      (item) => !knownById.has(item.garminActivityId.toString()),
    )) {
      await this.storeHeartRateSeries(activity.garminActivityId.toString());
    }
    return { created, updated, ignored };
  }

  /**
   * Télécharge le fichier d'origine d'une activité nouvelle et enregistre sa série de fréquence cardiaque.
   * Un échec (téléchargement, fichier illisible) est journalisé sans interrompre la synchronisation.
   */
  private async storeHeartRateSeries(garminActivityId: string): Promise<void> {
    try {
      const file = await this.garmin.fetchActivityFile(garminActivityId);
      const samples = this.heartRateExtractor.extract(file);
      await this.activities.saveHeartRateSamples(garminActivityId, samples);
    } catch (error) {
      this.logger.warn(
        `Série de fréquence cardiaque non enregistrée (${error instanceof Error ? error.name : 'erreur inconnue'})`,
      );
    }
  }
}
