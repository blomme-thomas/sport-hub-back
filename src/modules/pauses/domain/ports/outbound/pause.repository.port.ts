import type { Pause } from '../../entities/pause.entity.js';

export interface PauseRange {
  from?: string;
  to?: string;
}

export interface IPauseRepository {
  /** Renvoie la pause portant cet identifiant, ou null. */
  findById(id: string): Promise<Pause | null>;

  /**
   * Renvoie les pauses triées par date de début. Avec une période, ne renvoie que les pauses qui la chevauchent.
   */
  findAll(range: PauseRange): Promise<Pause[]>;

  /** Crée la pause si elle est nouvelle, la met à jour sinon. */
  save(pause: Pause): Promise<void>;

  /** Supprime la pause ; sans effet si elle n'existe pas. */
  delete(id: string): Promise<void>;
}

export const PAUSE_REPOSITORY = Symbol('PAUSE_REPOSITORY');
