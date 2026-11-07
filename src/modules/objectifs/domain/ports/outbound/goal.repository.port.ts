import type { Goal } from '../../entities/goal.entity.js';
import type { GoalId } from '../../value-objects/goal-id.vo.js';

export interface IGoalRepository {
  /** Renvoie l'objectif portant cet identifiant, ou null s'il n'existe pas. */
  findById(id: GoalId): Promise<Goal | null>;

  /**
   * Renvoie les objectifs triés par date cible croissante, sans date en dernier.
   * Avec `upcomingFrom`, ne renvoie que les objectifs dont la date cible est postérieure ou égale à cette date ; un objectif sans date n'est jamais renvoyé.
   */
  findAll(filter: { upcomingFrom?: Date }): Promise<Goal[]>;

  /** Enregistre l'objectif : crée s'il est nouveau, met à jour sinon (même identifiant). */
  save(goal: Goal): Promise<void>;

  /** Supprime l'objectif portant cet identifiant ; sans effet s'il n'existe pas. */
  delete(id: GoalId): Promise<void>;
}

export const GOAL_REPOSITORY = Symbol('GOAL_REPOSITORY');
