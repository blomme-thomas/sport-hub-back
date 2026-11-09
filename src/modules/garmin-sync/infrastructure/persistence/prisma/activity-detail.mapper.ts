/** Lit la FC maximale de la réponse Garmin enregistrée ; null si absente ou non numérique. */
export function maxHeartRateOf(rawPayload: unknown): number | null {
  if (typeof rawPayload !== 'object' || rawPayload === null) {
    return null;
  }
  const value = (rawPayload as { maxHR?: unknown }).maxHR;
  return typeof value === 'number' ? value : null;
}
