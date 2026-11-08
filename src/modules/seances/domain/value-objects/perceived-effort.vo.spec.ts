import { InvalidSessionModuleError } from '../errors/invalid-session-module.error.js';
import { PerceivedEffort } from './perceived-effort.vo.js';

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('PerceivedEffort', () => {
  it('restitue la valeur fournie', () => {
    expect(PerceivedEffort.create(6).value()).toBe(6);
  });

  it.each([
    ['la borne basse', 1],
    ['la borne haute', 10],
  ])('accepte %s de l’échelle 1 à 10', (_label, value) => {
    expect(PerceivedEffort.create(value).value()).toBe(value);
  });

  it.each([
    ['zéro', 0],
    ['au-dessus de la borne haute', 11],
    ['valeur négative', -1],
    ['fraction', 5.5],
    ['NaN', Number.NaN],
    ['infini', Number.POSITIVE_INFINITY],
  ])('refuse %s avec SESSION_MODULE_INVALID', (_label, value) => {
    const error = captureError(() => PerceivedEffort.create(value));

    expect(error).toBeInstanceOf(InvalidSessionModuleError);
    expect(error).toMatchObject({ code: 'SESSION_MODULE_INVALID' });
  });
});
