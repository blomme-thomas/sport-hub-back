/** Contrat vers le référentiel des disciplines : permet de vérifier qu'une clé de discipline existe. */
export interface IDisciplineCatalog {
  /** Indique si une discipline portant cette clé est connue du référentiel. */
  exists(typeKey: string): Promise<boolean>;
}

export const DISCIPLINE_CATALOG = Symbol('DISCIPLINE_CATALOG');
