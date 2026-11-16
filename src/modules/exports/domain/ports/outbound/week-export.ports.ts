/** Module de plan d'une séance, tel que présenté dans l'export. */
export interface WeekPlanModule {
  position: number;
  type: string;
  durationMinutes: number;
  instruction: string;
  targetZones: unknown;
  perceivedEffort: number | null;
}

/** Occurrence d'une séance dans la semaine, avec son plan et l'identifiant de l'activité liée à sa série. */
export interface WeekSessionOccurrence {
  sessionId: string;
  date: string;
  startTime: string | null;
  disciplineTypeKey: string;
  status: string;
  durationMinutes: number;
  targetDistanceMeters: number | null;
  targetHrZonePercentages: number[] | null;
  modules: WeekPlanModule[];
  linkedActivityId: string | null;
  achievement: {
    distanceRate: number | null;
    durationRate: number | null;
    zoneGapsPoints: number[] | null;
  } | null;
}

/** Activité réalisée, sans identifiant Garmin ni donnée brute. */
export interface WeekActivity {
  id: string;
  type: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  averageHeartRate: number | null;
}

export interface WeekActivityDetail extends WeekActivity {
  hrTimeInZone: (number | null)[];
  perceivedEffort: number | null;
  feeling: number | null;
}

export interface WeekVolume {
  count: number;
  durationSeconds: number;
  distanceMeters: number;
}

export interface WeekVariation {
  count: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
}

export interface WeekVolumes {
  current: WeekVolume;
  previous: WeekVolume;
  variation: WeekVariation;
}

/** Contrat vers le planning : occurrences d'une période, avec plan et rapprochement. */
export interface IWeekSessionsSource {
  /** Renvoie les occurrences dont la date tombe entre `from` et `to` (YYYY-MM-DD, bornes incluses). */
  findOccurrences(from: string, to: string): Promise<WeekSessionOccurrence[]>;
}

export const WEEK_SESSIONS_SOURCE = Symbol('WEEK_SESSIONS_SOURCE');

/** Contrat vers les activités synchronisées, lues en base sans appel à Garmin. */
export interface IWeekActivitiesSource {
  /** Renvoie les activités dont la date de début tombe dans la fenêtre (`from` inclus, `toExclusive` exclu). */
  findBetween(from: Date, toExclusive: Date): Promise<WeekActivity[]>;

  /** Renvoie le détail réalisé de l'activité, ou null si elle n'est pas enregistrée. */
  findDetail(id: string): Promise<WeekActivityDetail | null>;
}

export const WEEK_ACTIVITIES_SOURCE = Symbol('WEEK_ACTIVITIES_SOURCE');

/** Contrat vers les statistiques de volume : totaux de la semaine demandée, de la précédente et variation. */
export interface IWeekVolumesSource {
  /** Renvoie les volumes de la semaine commençant le lundi `monday`, avec la semaine précédente. */
  findWeek(monday: Date): Promise<WeekVolumes>;
}

export const WEEK_VOLUMES_SOURCE = Symbol('WEEK_VOLUMES_SOURCE');
