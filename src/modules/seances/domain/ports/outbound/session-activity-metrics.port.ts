import type { ActivityAchievementInput } from '../../services/session-achievement.js';

/** Contrat vers les activités synchronisées : fournit les données réalisées d'une activité, sans appel à Garmin. */
export interface ISessionActivityMetrics {
  /** Renvoie les données réalisées de l'activité, ou null si elle n'est pas enregistrée. */
  findByActivityId(
    activityId: string,
  ): Promise<ActivityAchievementInput | null>;
}

export const SESSION_ACTIVITY_METRICS = Symbol('SESSION_ACTIVITY_METRICS');
