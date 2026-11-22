import type { SessionSnapshot } from '../../services/free-slot-capacity.calculator.js';
import type { PlanningPeriod } from './slot-occurrences.provider.port.js';

/** Contrat vers les séances planifiées : fournit leur état sur une période. */
export interface ISessionsProvider {
  /** Renvoie les séances de la période, avec leur statut et leur indicateur de modification manuelle. */
  sessionsIn(period: PlanningPeriod): Promise<SessionSnapshot[]>;
}

export const SESSIONS_PROVIDER = Symbol('SESSIONS_PROVIDER');
