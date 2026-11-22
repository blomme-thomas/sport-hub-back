/** Activité réalisée, telle que le rapprochement la voit : identifiant, discipline et jour local (Europe/Paris). */
export interface ActivityReference {
  id: string;
  type: string;
  localDate: string;
}

/** Contrat vers les activités synchronisées : fournit les activités des jours donnés. */
export interface IActivityCatalog {
  /** Renvoie les activités dont le jour local est compris entre `from` et `to` (YYYY-MM-DD, bornes incluses). */
  activitiesOnDays(from: string, to: string): Promise<ActivityReference[]>;
}

export const ACTIVITY_CATALOG = Symbol('ACTIVITY_CATALOG');
