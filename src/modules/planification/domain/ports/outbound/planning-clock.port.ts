/** Horloge du module : renvoie le jour courant au format YYYY-MM-DD, injectée pour rendre le calcul testable. */
export type PlanningClock = () => string;

export const PLANNING_CLOCK = Symbol('PLANNING_CLOCK');
