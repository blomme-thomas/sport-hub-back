import {
  SESSION_RECURRENCES,
  isSessionRecurrence,
} from './session-recurrence.vo.js';

describe('SessionRecurrence', () => {
  it('liste les deux valeurs autorisées', () => {
    expect([...SESSION_RECURRENCES]).toEqual(['aucune', 'hebdomadaire']);
  });

  it.each(['aucune', 'hebdomadaire'])('reconnaît %s', (value) => {
    expect(isSessionRecurrence(value)).toBe(true);
  });

  it.each([
    ['valeur inconnue', 'mensuelle'],
    ['chaîne vide', ''],
    ['casse différente', 'Hebdomadaire'],
    ['valeur nulle', null],
    ['valeur absente', undefined],
  ])('rejette %s', (_label, value) => {
    expect(isSessionRecurrence(value)).toBe(false);
  });
});
