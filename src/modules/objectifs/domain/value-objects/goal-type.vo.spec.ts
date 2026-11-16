import { GOAL_TYPES, isGoalType } from './goal-type.vo.js';

describe('GoalType', () => {
  it('liste les quatre types d’objectif autorisés', () => {
    expect([...GOAL_TYPES]).toEqual([
      'evenement',
      'volume',
      'regularite',
      'hebdomadaire',
    ]);
  });

  it.each(['evenement', 'volume', 'regularite', 'hebdomadaire'])(
    'reconnaît %s comme un type d’objectif',
    (value) => {
      expect(isGoalType(value)).toBe(true);
    },
  );

  it.each([
    ['type inconnu', 'course'],
    ['chaîne vide', ''],
    ['casse différente', 'Evenement'],
    ['valeur nulle', null],
    ['valeur absente', undefined],
  ])('rejette %s', (_label, value) => {
    expect(isGoalType(value)).toBe(false);
  });
});
