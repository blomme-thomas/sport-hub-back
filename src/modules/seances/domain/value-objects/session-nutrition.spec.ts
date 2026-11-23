import { describe, expect, it } from 'vitest';
import { InvalidSessionError } from '../errors/invalid-session.error.js';
import {
  SESSION_CARBS_UNITS,
  assertCarbs,
  assertHydration,
} from './session-nutrition.vo.js';

describe('nutrition de séance', () => {
  it('expose les unités de glucides par heure et pour la séance', () => {
    expect([...SESSION_CARBS_UNITS]).toEqual(['par_heure', 'pour_la_seance']);
  });

  it.each([
    [1, 'par_heure'],
    [60, 'par_heure'],
    [1000, 'pour_la_seance'],
  ] as const)('accepte %s g avec l unité %s', (grams, unit) => {
    expect(() => assertCarbs(grams, unit)).not.toThrow();
  });

  it('accepte l absence de glucides et d unité', () => {
    expect(() => assertCarbs(null, null)).not.toThrow();
  });

  it('refuse des glucides sans unité', () => {
    expect(() => assertCarbs(60, null)).toThrow(InvalidSessionError);
  });

  it('refuse une unité sans glucides', () => {
    expect(() => assertCarbs(null, 'par_heure')).toThrow(InvalidSessionError);
  });

  it.each([0, -5, 1001, 12.5, Number.NaN])(
    'refuse des glucides de %s g',
    (grams) => {
      expect(() => assertCarbs(grams, 'par_heure')).toThrow(
        InvalidSessionError,
      );
    },
  );

  it('refuse une unité de glucides inconnue', () => {
    expect(() => assertCarbs(60, 'par_minute' as never)).toThrow(
      InvalidSessionError,
    );
  });

  it.each([1, 500, 20000])('accepte une hydratation de %s ml', (ml) => {
    expect(() => assertHydration(ml)).not.toThrow();
  });

  it.each([0, -100, 20001, 250.5, Number.NaN])(
    'refuse une hydratation de %s ml',
    (ml) => {
      expect(() => assertHydration(ml)).toThrow(InvalidSessionError);
    },
  );
});
