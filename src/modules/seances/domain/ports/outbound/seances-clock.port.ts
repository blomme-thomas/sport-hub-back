/** Horloge du module : renvoie l'instant courant, injectée pour rendre le journal des modifications testable. */
export type SeancesClock = () => Date;

export const SEANCES_CLOCK = Symbol('SEANCES_CLOCK');
