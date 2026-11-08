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
}

export const GARMIN_CONNECT_CLIENT = Symbol('GARMIN_CONNECT_CLIENT');
