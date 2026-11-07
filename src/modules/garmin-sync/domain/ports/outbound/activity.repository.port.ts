import type { Activity } from '../../entities/activity.entity.js';
import type { GarminActivityId } from '../../value-objects/garmin-activity-id.vo.js';

export interface IActivityRepository {
  /** Renvoie la date de début de l'activité la plus récente connue, ou null si aucune n'est enregistrée. */
  findLatestStartedAt(): Promise<Date | null>;

  /** Renvoie les activités déjà enregistrées parmi les identifiants Garmin fournis. */
  findByGarminActivityIds(ids: GarminActivityId[]): Promise<Activity[]>;

  /** Enregistre les activités en une seule transaction : crée les nouvelles, met à jour les existantes par identifiant Garmin. */
  save(activities: Activity[]): Promise<void>;
}

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');
