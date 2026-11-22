export interface IDisciplineRegistry {
  /**
   * Enregistre l'apparition des clés de type brutes telles que Garmin les fournit ; les clés vides ou répétées sont sans effet.
   *
   * @throws Error si le référentiel des disciplines est indisponible.
   */
  recordAppearances(typeKeys: string[]): Promise<void>;
}

export const DISCIPLINE_REGISTRY = Symbol('DISCIPLINE_REGISTRY');
