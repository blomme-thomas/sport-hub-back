import type { WeekSessionOccurrence } from './week-export.ports.js';

/** Contrat vers le planning : une séance par identifiant, avec son plan, son rapprochement et son atteinte. */
export interface ISessionExportSource {
  /** Renvoie la séance sous forme d'occurrence, ou null si elle n'existe pas. */
  findSession(id: string): Promise<WeekSessionOccurrence | null>;
}

export const SESSION_EXPORT_SOURCE = Symbol('SESSION_EXPORT_SOURCE');
