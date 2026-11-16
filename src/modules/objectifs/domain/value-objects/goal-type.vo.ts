/** `hebdomadaire` : temps cible par semaine ISO, sans date ni format (un seul à la fois). */
export const GOAL_TYPES = [
  'evenement',
  'volume',
  'regularite',
  'hebdomadaire',
] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

export function isGoalType(value: unknown): value is GoalType {
  return (
    typeof value === 'string' &&
    (GOAL_TYPES as readonly string[]).includes(value)
  );
}
