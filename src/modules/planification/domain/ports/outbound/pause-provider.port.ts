import type { PlanningPeriod } from './slot-occurrences.provider.port.js';

/** Pause, réduite aux bornes utiles à la planification (AAAA-MM-JJ, incluses). */
export interface PausedPeriod {
  from: string;
  to: string;
}

/** Contrat vers les pauses : fournit les périodes pendant lesquelles aucune séance ne doit être proposée. */
export interface IPauseProvider {
  /** Renvoie les pauses qui chevauchent la période. */
  pausesIn(period: PlanningPeriod): Promise<PausedPeriod[]>;
}

export const PAUSE_PROVIDER = Symbol('PAUSE_PROVIDER');
