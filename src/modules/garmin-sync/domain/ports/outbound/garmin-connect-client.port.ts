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
}

export interface HeartRateZonesConfig {
  readonly trainingMethod: string | null;
  readonly maxHeartRateUsed: number | null;
  readonly restingHeartRateUsed: number | null;
  /** Bornes basses des zones 1 à 5, dans cet ordre. */
  readonly zoneFloors: readonly (number | null)[];
}

export const GARMIN_CONNECT_CLIENT = Symbol('GARMIN_CONNECT_CLIENT');
