import type { WeeklyTarget } from '../../value-objects/weekly-target.vo.js';

export interface IUserSettingsRepository {
  /** Renvoie la cible hebdomadaire enregistrée, ou null si aucune n'est définie (ou aucune ligne n'existe). */
  findWeeklyTarget(): Promise<WeeklyTarget>;

  /** Enregistre la cible hebdomadaire (null la retire). Crée la ligne réglages au premier enregistrement. */
  saveWeeklyTarget(target: WeeklyTarget): Promise<void>;
}

export const USER_SETTINGS_REPOSITORY = Symbol('USER_SETTINGS_REPOSITORY');
