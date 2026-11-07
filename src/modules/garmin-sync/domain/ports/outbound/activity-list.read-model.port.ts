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
}

export const ACTIVITY_LIST_READ_MODEL = Symbol('ACTIVITY_LIST_READ_MODEL');
