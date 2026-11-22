export interface PlanningGoal {
  title: string;
  type: string;
  targetDate: string | null;
  eventFormat: string | null;
  targetTimeSeconds: number | null;
}

/** Contrat vers les objectifs : fournit l'objectif servant de fin de période. */
export interface IGoalProvider {
  /** @throws GoalNotFoundError si l'objectif n'existe pas (erreur du module objectifs). */
  findGoal(id: string): Promise<PlanningGoal>;
}

export const GOAL_PROVIDER = Symbol('GOAL_PROVIDER');
