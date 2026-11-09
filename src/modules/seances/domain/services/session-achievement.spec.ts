import { describe, expect, it } from 'vitest';
import { computeAchievement } from './session-achievement.js';

const TARGETS = {
  targetDistanceMeters: 10000,
  durationMinutes: 60,
  targetHrZonePercentages: [10, 20, 40, 20, 10],
};

describe('computeAchievement', () => {
  it('renvoie des taux de réalisation et des écarts par zone signés', () => {
    const result = computeAchievement(TARGETS, {
      distanceMeters: 8000,
      durationSeconds: 3000,
      hrTimeInZone: [300, 600, 1200, 600, 300],
    });

    expect(result.distanceRate).toBe(80);
    expect(result.durationRate).toBe(83.3);
    expect(result.zoneGapsPoints).toEqual([0, 0, 0, 0, 0]);
  });

  it('plafonne les taux à 100 %', () => {
    const result = computeAchievement(TARGETS, {
      distanceMeters: 12000,
      durationSeconds: 4000,
      hrTimeInZone: [0, 0, 0, 0, 1],
    });

    expect(result.distanceRate).toBe(100);
    expect(result.durationRate).toBe(100);
  });

  it('exprime l’écart par zone en points, signé et non plafonné', () => {
    const result = computeAchievement(TARGETS, {
      distanceMeters: 10000,
      durationSeconds: 3600,
      hrTimeInZone: [0, 0, 0, 0, 100],
    });

    expect(result.zoneGapsPoints).toEqual([-10, -20, -40, -20, 90]);
  });

  it('renvoie null pour une métrique sans objectif correspondant', () => {
    const result = computeAchievement(
      {
        targetDistanceMeters: null,
        durationMinutes: 60,
        targetHrZonePercentages: null,
      },
      {
        distanceMeters: 8000,
        durationSeconds: 3600,
        hrTimeInZone: [1, 1, 1, 1, 1],
      },
    );

    expect(result.distanceRate).toBeNull();
    expect(result.zoneGapsPoints).toBeNull();
    expect(result.durationRate).toBe(100);
  });

  it('renvoie null pour les écarts quand l’activité n’a aucun temps de zone', () => {
    const result = computeAchievement(TARGETS, {
      distanceMeters: 10000,
      durationSeconds: 3600,
      hrTimeInZone: [null, null, null, null, null],
    });

    expect(result.zoneGapsPoints).toBeNull();
  });

  it('renvoie null pour une distance absente de l’activité', () => {
    const result = computeAchievement(TARGETS, {
      distanceMeters: null,
      durationSeconds: 3600,
      hrTimeInZone: [0, 0, 0, 0, 0],
    });

    expect(result.distanceRate).toBeNull();
  });
});
