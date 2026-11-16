import { InvalidWeeklyTargetError } from '../errors/invalid-weekly-target.error.js';
import { MAX_WEEKLY_TARGET_SECONDS, WeeklyTarget } from './weekly-target.vo.js';

describe('WeeklyTarget', () => {
  it('accepte un temps positif entier et le restitue', () => {
    expect(WeeklyTarget.create(28800).seconds()).toBe(28800);
  });

  it('accepte null pour signifier qu’il n’y a pas de cible', () => {
    expect(WeeklyTarget.create(null).seconds()).toBeNull();
  });

  it(`accepte la valeur maximale ${MAX_WEEKLY_TARGET_SECONDS}`, () => {
    expect(WeeklyTarget.create(MAX_WEEKLY_TARGET_SECONDS).seconds()).toBe(
      MAX_WEEKLY_TARGET_SECONDS,
    );
  });

  it.each([
    ['zéro', 0],
    ['négatif', -60],
    ['décimal', 1.5],
    ['au-delà du maximum', MAX_WEEKLY_TARGET_SECONDS + 1],
    ['NaN', Number.NaN],
  ])(
    'refuse une cible %s avec SETTINGS_WEEKLY_TARGET_INVALID',
    (_label, seconds) => {
      expect(() => WeeklyTarget.create(seconds)).toThrow(
        InvalidWeeklyTargetError,
      );
    },
  );
});
