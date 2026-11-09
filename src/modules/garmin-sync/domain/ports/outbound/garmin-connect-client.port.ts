import type { Activity } from '../../entities/activity.entity.js';

export interface IGarminConnectClient {
  /**
   * Récupère les activités Garmin de l'utilisateur démarrées à partir de `since`, ou, si `since` est nul, des 365 derniers jours au plus.
   *
   * @throws GarminAccessDeniedError si Garmin refuse la clé ou le jeton.
   * @throws GarminUnavailableError si Garmin est en panne ou répond de façon inattendue.
   */
  fetchActivitiesSince(since: Date | null): Promise<Activity[]>;

  /**
   * Renvoie le nom affiché du compte Garmin, ou null si Garmin ne le fournit pas.
   *
   * @throws GarminAccessDeniedError si Garmin refuse la clé ou le jeton.
   * @throws GarminUnavailableError si Garmin est en panne ou répond de façon inattendue.
   */
  fetchDisplayName(): Promise<string | null>;

  /**
   * Renvoie la configuration des zones cardiaques du sport par défaut, ou null si l'utilisateur n'en a configuré aucune.
   * Garmin ne génère pas de zones par défaut (generateDefaults=false) : aucune valeur n'est inventée.
   *
   * @throws GarminAccessDeniedError si Garmin refuse la clé ou le jeton.
   * @throws GarminUnavailableError si Garmin est en panne ou répond de façon inattendue.
   */
  fetchHeartRateZones(): Promise<HeartRateZonesConfig | null>;

  /**
   * Renvoie les données de récupération de chaque jour de la plage (dates incluses, format YYYY-MM-DD), dans l'ordre chronologique.
   * Un jour sans donnée Garmin (y compris un 204) a ses indicateurs à null, jamais à zéro.
   *
   * @throws GarminAccessDeniedError si Garmin refuse la clé ou le jeton.
   * @throws GarminUnavailableError si Garmin est en panne ou répond de façon inattendue.
   */
  fetchRecoveryDays(range: RecoveryRange): Promise<RecoveryDay[]>;

  /**
   * Renvoie les calories journalières de chaque jour de la plage (dates incluses), dans l'ordre chronologique, jours sans séance compris.
   * La valeur est le total de la journée Garmin (`burnedTotal`, repos inclus). Un jour sans donnée a `calories` à null, jamais à zéro.
   *
   * @throws GarminAccessDeniedError si Garmin refuse la clé ou le jeton.
   * @throws GarminUnavailableError si Garmin est en panne ou répond de façon inattendue.
   */
  fetchDailyCalories(range: RecoveryRange): Promise<DailyCaloriesDay[]>;
}

export interface DailyCaloriesDay {
  /** Jour calendaire, format YYYY-MM-DD. */
  readonly date: string;
  readonly calories: number | null;
}

export interface RecoveryRange {
  /** Premier jour inclus, YYYY-MM-DD. */
  readonly from: string;
  /** Dernier jour inclus, YYYY-MM-DD. */
  readonly to: string;
}

export interface RecoveryDay {
  readonly date: string;
  readonly sleepSeconds: number | null;
  readonly hrvLastNightAvg: number | null;
  readonly hrvWeeklyAvg: number | null;
  readonly bodyBatteryCharged: number | null;
  readonly bodyBatteryDrained: number | null;
  readonly restingHeartRate: number | null;
}

export interface HeartRateZonesConfig {
  readonly trainingMethod: string | null;
  readonly maxHeartRateUsed: number | null;
  readonly restingHeartRateUsed: number | null;
  /** Bornes basses des zones 1 à 5, dans cet ordre. */
  readonly zoneFloors: readonly (number | null)[];
}

export const GARMIN_CONNECT_CLIENT = Symbol('GARMIN_CONNECT_CLIENT');
