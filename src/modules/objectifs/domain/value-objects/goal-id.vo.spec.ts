import { InvalidGoalError } from '../errors/invalid-goal.error.js';
import { GoalId } from './goal-id.vo.js';

const GOAL_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('GoalId', () => {
  it('génère un identifiant au format UUID', () => {
    expect(GoalId.generate().toString()).toMatch(UUID_PATTERN);
  });

  it('génère un identifiant distinct à chaque appel', () => {
    expect(GoalId.generate().toString()).not.toBe(GoalId.generate().toString());
  });

  it('restitue l’UUID fourni tel quel', () => {
    expect(GoalId.create(GOAL_ID).toString()).toBe(GOAL_ID);
  });

  it('considère comme égaux deux identifiants de même valeur', () => {
    expect(GoalId.create(GOAL_ID).equals(GoalId.create(GOAL_ID))).toBe(true);
  });

  it('considère comme distincts deux identifiants de valeurs différentes', () => {
    expect(GoalId.create(GOAL_ID).equals(GoalId.generate())).toBe(false);
  });

  it.each([
    ['chaîne vide', ''],
    ['texte libre', 'objectif'],
    ['UUID tronqué', GOAL_ID.slice(0, -1)],
    ['UUID avec un caractère non hexadécimal', GOAL_ID.replace('0', 'z')],
  ])('refuse %s avec GOAL_INVALID', (_label, value) => {
    const error = captureError(() => GoalId.create(value));

    expect(error).toBeInstanceOf(InvalidGoalError);
    expect(error).toMatchObject({ code: 'GOAL_INVALID' });
  });
});
