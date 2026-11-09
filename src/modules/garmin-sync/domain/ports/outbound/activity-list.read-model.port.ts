import type { ActivityFitDocument } from './activity-heart-rate.extractor.port.js';

export interface ActivityListCriteria {
  page: number;
  pageSize: number;
  from: Date | null;
  to: Date | null;
  type: string | null;
}

export interface ActivityListItem {
  id: string;
  garminActivityId: string;
  type: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  averageHeartRate: number | null;
}

export interface ActivityDetailItem extends ActivityListItem {
  calories: number | null;
  elevationGainMeters: number | null;
  maxHeartRate: number | null;
  /** Cinq zones cardiaques, de la zone 1 à la zone 5. */
  hrTimeInZone: (number | null)[];
  /** Série de fréquence cardiaque décodée du fichier d'origine, null si elle n'a pas été décodée. */
  heartRateSeries: { occurredAt: Date; bpm: number }[] | null;
}

export interface ActivityListPage {
  items: ActivityListItem[];
  total: number;
}

export interface IActivityListReadModel {
  /**
   * Renvoie une page d'activités triée de la plus récente à la plus ancienne, avec le nombre total d'activités correspondant aux critères.
   * `from` et `to` sont inclusifs sur la date de début ; `type` est une correspondance exacte.
   */
  list(criteria: ActivityListCriteria): Promise<ActivityListPage>;

  /** Renvoie l'activité portant cet identifiant, ou null si elle n'est pas enregistrée. */
  findById(id: string): Promise<ActivityListItem | null>;

  /** Renvoie le détail de l'activité portant cet identifiant, ou null si elle n'est pas enregistrée. */
  findDetailById(id: string): Promise<ActivityDetailItem | null>;

  /** Renvoie le document FIT compact de l'activité, ou null si aucun n'a été enregistré. */
  findFitDocument(id: string): Promise<ActivityFitDocument | null>;
}

export const ACTIVITY_LIST_READ_MODEL = Symbol('ACTIVITY_LIST_READ_MODEL');
