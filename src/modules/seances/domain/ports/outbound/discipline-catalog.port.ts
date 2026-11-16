/** Contrat vers le référentiel des disciplines : permet de vérifier qu'une clé de discipline existe et de lister les clés connues. */
export interface IDisciplineCatalog {
  /** Indique si une discipline portant cette clé est connue du référentiel. */
  exists(typeKey: string): Promise<boolean>;

  /** Renvoie les clés de type de toutes les disciplines connues, dans l'ordre du référentiel. */
  listTypeKeys(): Promise<string[]>;
}

export const DISCIPLINE_CATALOG = Symbol('DISCIPLINE_CATALOG');
