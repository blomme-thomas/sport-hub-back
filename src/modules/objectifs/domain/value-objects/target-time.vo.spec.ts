import { InvalidTargetTimeError } from '../errors/invalid-target-time.error.js';
import { TargetTime } from './target-time.vo.js';

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('TargetTime', () => {
  it('restitue le nombre de secondes fourni', () => {
    expect(TargetTime.create(7200).seconds()).toBe(7200);
  });

  it.each([
    ['une seconde', 1],
    ['une journée entière', 86400],
    ['la borne maximale de la colonne INTEGER', 2147483647],
  ])('accepte %s', (_label, seconds) => {
    expect(TargetTime.create(seconds).seconds()).toBe(seconds);
  });

  it.each([
    ['zéro', 0],
    ['valeur négative', -1],
    ['fraction de seconde', 90.5],
    ['NaN', Number.NaN],
    ['infini', Number.POSITIVE_INFINITY],
    ['une seconde au-delà de la borne INTEGER', 2147483648],
    ['une valeur de 3000000000 secondes', 3000000000],
  ])('refuse %s avec GOAL_TARGET_TIME_INVALID', (_label, seconds) => {
    const error = captureError(() => TargetTime.create(seconds));

    expect(error).toBeInstanceOf(InvalidTargetTimeError);
    expect(error).toMatchObject({ code: 'GOAL_TARGET_TIME_INVALID' });
  });
});
