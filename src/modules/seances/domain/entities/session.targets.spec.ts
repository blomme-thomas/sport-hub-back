import { describe, expect, it } from 'vitest';
import { InvalidSessionError } from '../errors/invalid-session.error.js';
import { Session } from './session.entity.js';

const NOW = new Date('2026-11-09T10:00:00.000Z');
const BASE = {
  date: new Date('2026-11-16T00:00:00.000Z'),
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
};

describe('Session : objectifs', () => {
  it('garde la distance visée et la répartition par zone à la création', () => {
    const session = Session.create({
      ...BASE,
      targetDistanceMeters: 2000,
      targetHrZonePercentages: [10, 20, 40, 20, 10],
    });

    expect(session.targetDistanceMeters).toBe(2000);
    expect(session.targetHrZonePercentages).toEqual([10, 20, 40, 20, 10]);
  });

  it('laisse les objectifs à null par défaut (séances existantes)', () => {
    const session = Session.create(BASE);

    expect(session.targetDistanceMeters).toBeNull();
    expect(session.targetHrZonePercentages).toBeNull();
  });

  it('refuse une répartition qui ne totalise pas 100', () => {
    expect(() =>
      Session.create({
        ...BASE,
        targetHrZonePercentages: [10, 10, 10, 10, 10],
      }),
    ).toThrow(InvalidSessionError);
  });

  it('journalise la modification d’un objectif', () => {
    const changed = Session.create(BASE).change(
      { targetDistanceMeters: 5000 },
      NOW,
    );

    expect(changed.targetDistanceMeters).toBe(5000);
    expect(changed.modifiedManually).toBe(true);
    expect(changed.changeLog).toEqual([
      { changedAt: NOW, field: 'targetDistanceMeters', previousValue: null },
    ]);
  });

  it('refuse une distance visée nulle ou négative à la modification', () => {
    expect(() =>
      Session.create(BASE).change({ targetDistanceMeters: 0 }, NOW),
    ).toThrow(InvalidSessionError);
  });
});
