import { describe, expect, it } from 'vitest';
import { maxHeartRateOf } from './activity-detail.mapper.js';

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
