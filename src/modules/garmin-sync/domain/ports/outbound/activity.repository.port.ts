import type { Activity } from '../../entities/activity.entity.js';
import type { GarminActivityId } from '../../value-objects/garmin-activity-id.vo.js';
import type { ActivityFitExtraction } from './activity-heart-rate.extractor.port.js';

export interface IActivityRepository {
  /** Renvoie la date de début de l'activité la plus récente connue, ou null si aucune n'est enregistrée. */
  findLatestStartedAt(): Promise<Date | null>;

  /** Renvoie les activités déjà enregistrées parmi les identifiants Garmin fournis. */
  findByGarminActivityIds(ids: GarminActivityId[]): Promise<Activity[]>;

  /** Enregistre les activités en une seule transaction : crée les nouvelles, met à jour les existantes par identifiant Garmin. */
  save(activities: Activity[]): Promise<void>;

  /** Remplace, en une transaction, la série de fréquence cardiaque et le document FIT de l'activité portant cet identifiant Garmin ; sans effet si l'activité n'est pas enregistrée. */
  saveFitExtraction(
    garminActivityId: string,
    extraction: ActivityFitExtraction,
  ): Promise<void>;
}

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');
