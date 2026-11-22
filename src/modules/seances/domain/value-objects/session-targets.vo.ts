import { InvalidSessionError } from '../errors/invalid-session.error.js';

export const HR_ZONE_COUNT = 5;

/** Répartition cible du temps par zone de FC (Z1 à Z5), en pourcentages entiers qui totalisent 100. */
export function assertTargetZones(zones: readonly number[]): void {
  if (zones.length !== HR_ZONE_COUNT) {
    throw new InvalidSessionError(
      'la répartition doit compter exactement 5 zones',
    );
  }
  if (
    zones.some((value) => !Number.isInteger(value) || value < 0 || value > 100)
  ) {
    throw new InvalidSessionError(
      'chaque zone doit être un pourcentage entier de 0 à 100',
    );
  }
  if (zones.reduce((sum, value) => sum + value, 0) !== 100) {
    throw new InvalidSessionError(
      'la répartition par zone doit totaliser 100 %',
    );
  }
}

/** Distance visée en mètres, strictement positive. */
export function assertTargetDistance(meters: number): void {
  if (!Number.isFinite(meters) || meters <= 0) {
    throw new InvalidSessionError(
      'la distance visée doit être strictement positive',
    );
  }
}
