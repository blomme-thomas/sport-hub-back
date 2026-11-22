export interface SessionTargetsInput {
  targetDistanceMeters: number | null;
  durationMinutes: number;
  targetHrZonePercentages: readonly number[] | null;
}

/** Données réalisées de l'activité liée, lues sans appel à Garmin. `hrTimeInZone` est supposé en secondes. */
export interface ActivityAchievementInput {
  distanceMeters: number | null;
  durationSeconds: number;
  hrTimeInZone: readonly (number | null)[];
}

export interface SessionAchievement {
  /** Distance réelle / distance visée, en pourcentage, plafonné à 100 ; null sans objectif ou sans distance. */
  distanceRate: number | null;
  /** Durée réelle / durée visée, en pourcentage, plafonné à 100. */
  durationRate: number | null;
  /** Écart réel − visé par zone, en points de pourcentage, signé et non plafonné ; null sans objectif ou sans temps de zone. */
  zoneGapsPoints: number[] | null;
}

export function computeAchievement(
  targets: SessionTargetsInput,
  activity: ActivityAchievementInput,
): SessionAchievement {
  return {
    distanceRate: rateOf(activity.distanceMeters, targets.targetDistanceMeters),
    durationRate: rateOf(
      activity.durationSeconds,
      targets.durationMinutes * 60,
    ),
    zoneGapsPoints: zoneGapsOf(
      targets.targetHrZonePercentages,
      activity.hrTimeInZone,
    ),
  };
}

function rateOf(actual: number | null, target: number | null): number | null {
  if (actual === null || target === null || target <= 0) {
    return null;
  }
  return round(Math.min(100, (actual / target) * 100));
}

function zoneGapsOf(
  targets: readonly number[] | null,
  times: readonly (number | null)[],
): number[] | null {
  if (targets === null) {
    return null;
  }
  const measured = times.map((value) => value ?? 0);
  const total = measured.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return null;
  }
  return targets.map((target, index) =>
    round(((measured[index] ?? 0) / total) * 100 - target),
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
