import { Inject, Injectable } from '@nestjs/common';
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
  GARMIN_CONNECT_CLIENT,
  type IGarminConnectClient,
} from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { SyncWindow } from '../../domain/value-objects/sync-window.vo.js';
import type { SyncGarminActivitiesResultDto } from '../dtos/sync-garmin-activities-result.dto.js';

@Injectable()
export class SyncGarminActivitiesUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly activities: IActivityRepository,
    @Inject(GARMIN_CONNECT_CLIENT)
    private readonly garmin: IGarminConnectClient,
    @Inject(DISCIPLINE_REGISTRY)
    private readonly disciplines: IDisciplineRegistry,
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
    return { created, updated, ignored };
  }
}
