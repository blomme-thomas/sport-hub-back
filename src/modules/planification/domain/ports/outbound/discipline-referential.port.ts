export interface PlanningDiscipline {
  typeKey: string;
  label: string;
}

/** Contrat vers le référentiel des disciplines : fournit les disciplines qu'une séance peut utiliser. */
export interface IDisciplineReferential {
  list(): Promise<PlanningDiscipline[]>;
}

export const DISCIPLINE_REFERENTIAL = Symbol('DISCIPLINE_REFERENTIAL');
