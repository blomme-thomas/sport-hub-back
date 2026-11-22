export interface RecentTrainingTypeVolume {
  type: string;
  activityCount: number;
  durationSeconds: number;
  distanceMeters: number;
}

export interface RecentTrainingWeek {
  start: Date;
  end: Date;
  activityCount: number;
  durationSeconds: number;
  distanceMeters: number;
  byType: RecentTrainingTypeVolume[];
}

export interface RecentTrainingContext {
  weeks: RecentTrainingWeek[];
}

export interface IRecentTrainingContextProvider {
  /**
   * Renvoie les `weeks` dernières semaines complètes d'entraînement, de la plus ancienne à la plus récente.
   * Une semaine sans activité figure avec des valeurs à zéro.
   */
  getRecent(weeks: number): Promise<RecentTrainingContext>;
}

export const RECENT_TRAINING_CONTEXT_PROVIDER = Symbol(
  'RECENT_TRAINING_CONTEXT_PROVIDER',
);
