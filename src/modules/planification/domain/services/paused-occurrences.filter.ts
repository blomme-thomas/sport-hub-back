import type { PausedPeriod } from '../ports/outbound/pause-provider.port.js';

/**
 * Retire les occurrences dont la date tombe dans une pause (bornes incluses).
 * Les dates sont comparées au format AAAA-MM-JJ, ce qui préserve l'ordre chronologique.
 */
export function removePausedOccurrences<T extends { date: string }>(
  occurrences: readonly T[],
  pauses: readonly PausedPeriod[],
): T[] {
  return occurrences.filter(
    (occurrence) =>
      !pauses.some(
        (pause) => occurrence.date >= pause.from && occurrence.date <= pause.to,
      ),
  );
}
