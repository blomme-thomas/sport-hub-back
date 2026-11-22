import type { SlotOccurrenceSnapshot } from '../../services/free-slot-capacity.calculator.js';

/** Période de planification, bornes incluses, au format YYYY-MM-DD. */
export interface PlanningPeriod {
  from: string;
  to: string;
}

/** Contrat vers les créneaux : fournit leurs occurrences sur une période. */
export interface ISlotOccurrencesProvider {
  /** Renvoie les occurrences des créneaux libres et occupés de la période. */
  occurrencesIn(period: PlanningPeriod): Promise<SlotOccurrenceSnapshot[]>;
}

export const SLOT_OCCURRENCES_PROVIDER = Symbol('SLOT_OCCURRENCES_PROVIDER');
