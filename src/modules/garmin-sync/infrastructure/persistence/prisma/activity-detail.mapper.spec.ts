import { describe, expect, it } from 'vitest';
import {
  feelingOf,
  maxHeartRateOf,
  perceivedEffortOf,
} from './activity-detail.mapper.js';

describe('maxHeartRateOf', () => {
  it('lit la FC maximale du payload Garmin', () => {
    expect(maxHeartRateOf({ activityId: 1, maxHR: 172 })).toBe(172);
  });

  it('renvoie null quand le payload n’a pas de FC maximale', () => {
    expect(maxHeartRateOf({ activityId: 1 })).toBeNull();
  });

  it.each([
    ['une valeur textuelle', { maxHR: '172' }],
    ['une valeur null', { maxHR: null }],
    ['un payload absent', null],
    ['un payload texte', 'brut'],
  ])('renvoie null pour %s', (_label, payload) => {
    expect(maxHeartRateOf(payload)).toBeNull();
  });
});

describe('perceivedEffortOf', () => {
  it("convertit workoutRpe (dixième de l'échelle 1 à 10) en effort de 1 à 10", () => {
    expect(perceivedEffortOf({ session: { workoutRpe: 60 } })).toBe(6);
    expect(perceivedEffortOf({ session: { workoutRpe: 100 } })).toBe(10);
    expect(perceivedEffortOf({ session: { workoutRpe: 20 } })).toBe(2);
  });

  it('renvoie null sans session, sans valeur ou hors de la grille', () => {
    expect(perceivedEffortOf(null)).toBeNull();
    expect(perceivedEffortOf({ session: null })).toBeNull();
    expect(perceivedEffortOf({ session: {} })).toBeNull();
    expect(perceivedEffortOf({ session: { workoutRpe: 65 } })).toBeNull();
    expect(perceivedEffortOf({ session: { workoutRpe: 0 } })).toBeNull();
    expect(perceivedEffortOf({ session: { workoutRpe: '60' } })).toBeNull();
  });
});

describe('feelingOf', () => {
  it('renvoie la valeur brute observée de workoutFeel', () => {
    expect(feelingOf({ session: { workoutFeel: 75 } })).toBe(75);
    expect(feelingOf({ session: { workoutFeel: 25 } })).toBe(25);
  });

  it('renvoie null sans session, sans valeur ou hors des valeurs observées', () => {
    expect(feelingOf(null)).toBeNull();
    expect(feelingOf({ session: null })).toBeNull();
    expect(feelingOf({ session: {} })).toBeNull();
    expect(feelingOf({ session: { workoutFeel: 60 } })).toBeNull();
    expect(feelingOf({ session: { workoutFeel: '75' } })).toBeNull();
  });
});
