import { GOAL_TYPES, isGoalType } from './goal-type.vo.js';

describe('GoalType', () => {
  it('liste les trois types d’objectif autorisés', () => {
    expect([...GOAL_TYPES]).toEqual(['evenement', 'volume', 'regularite']);
  });

  it.each(['evenement', 'volume', 'regularite'])(
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
