/** Exception à une occurrence d'une série : déplacement (date et heure facultative) ou annulation. Absente = programmation de la série. */
export interface SessionOccurrenceException {
  readonly sessionId: string;
  /** Date de programmation de l'occurrence dans la série, jour calendaire UTC. */
  readonly occurrenceDate: Date;
  /** Nouvelle date de l'occurrence déplacée, null si elle n'est pas déplacée. */
  readonly movedDate: Date | null;
  /** Nouvelle heure de début (HH:MM), null si elle garde celle de la série. */
  readonly movedStartTime: string | null;
  readonly cancelled: boolean;
}
