export interface DailyCalories {
  /** Jour calendaire, format YYYY-MM-DD. */
  readonly date: string;
  /** Calories journalières du résumé quotidien, null si le jour n'a pas de donnée. */
  readonly calories: number | null;
}

export interface DailyCaloriesWindow {
  readonly from: Date;
  readonly toExclusive: Date;
}

export interface IDailyCaloriesProvider {
  /**
   * Renvoie une entrée par jour de la fenêtre (`from` inclus, `toExclusive` exclu), jours sans séance compris, dans l'ordre chronologique.
   * Un jour sans donnée a `calories` à null, jamais à zéro.
   *
   * @throws DomainError si la source de calories journalières est indisponible ou refuse l'accès.
   */
  findDailyCalories(window: DailyCaloriesWindow): Promise<DailyCalories[]>;
}

export const DAILY_CALORIES_PROVIDER = Symbol('DAILY_CALORIES_PROVIDER');
