/**
 * Lit l'effort perçu saisi dans Garmin depuis le document FIT : `workoutRpe` vaut 10 fois l'échelle de 1 à 10 (valeurs observées : 20 à 100).
 * Renvoie null si la valeur est absente ou hors de cette grille.
 */
export function perceivedEffortOf(fitDocument: unknown): number | null {
  if (typeof fitDocument !== 'object' || fitDocument === null) {
    return null;
  }
  const session = (fitDocument as { session?: unknown }).session;
  if (typeof session !== 'object' || session === null) {
    return null;
  }
  const rpe = (session as { workoutRpe?: unknown }).workoutRpe;
  if (typeof rpe !== 'number' || rpe < 10 || rpe > 100 || rpe % 10 !== 0) {
    return null;
  }
  return rpe / 10;
}

/**
 * Lit le ressenti de la séance saisi dans Garmin depuis le document FIT : `workoutFeel`, valeur brute 0 à 100.
 * Valeurs observées : 25, 50, 75 et 100 (sens exact de chaque palier non confirmé). Renvoie null hors de ces valeurs.
 */
export function feelingOf(fitDocument: unknown): number | null {
  if (typeof fitDocument !== 'object' || fitDocument === null) {
    return null;
  }
  const session = (fitDocument as { session?: unknown }).session;
  if (typeof session !== 'object' || session === null) {
    return null;
  }
  const feel = (session as { workoutFeel?: unknown }).workoutFeel;
  return typeof feel === 'number' && OBSERVED_FEELINGS.includes(feel)
    ? feel
    : null;
}

const OBSERVED_FEELINGS: readonly number[] = [25, 50, 75, 100];

/** Lit la FC maximale de la réponse Garmin enregistrée ; null si absente ou non numérique. */
export function maxHeartRateOf(rawPayload: unknown): number | null {
  if (typeof rawPayload !== 'object' || rawPayload === null) {
    return null;
  }
  const value = (rawPayload as { maxHR?: unknown }).maxHR;
  return typeof value === 'number' ? value : null;
}
