import type { PlannedSession } from '../../value-objects/planned-session.vo.js';

export interface ScheduledSession {
  id: string;
  date: string;
  disciplineTypeKey: string;
  durationMinutes: number;
}

/** Contrat vers les séances : enregistre le planning contrôlé. */
export interface IPlanningScheduler {
  /** Crée les séances planifiées, dans l'ordre fourni. */
  schedule(sessions: readonly PlannedSession[]): Promise<ScheduledSession[]>;
}

export const PLANNING_SCHEDULER = Symbol('PLANNING_SCHEDULER');
