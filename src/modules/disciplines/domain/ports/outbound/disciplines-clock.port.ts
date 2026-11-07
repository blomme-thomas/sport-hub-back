/** Horloge injectée : renvoie l'instant courant, utilisé comme date d'apparition d'une discipline. */
export type DisciplinesClock = () => Date;

export const DISCIPLINES_CLOCK = Symbol('DISCIPLINES_CLOCK');
