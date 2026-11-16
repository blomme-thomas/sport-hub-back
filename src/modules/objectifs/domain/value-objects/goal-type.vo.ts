export const GOAL_TYPES = ['evenement', 'volume', 'regularite'] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

export function isGoalType(value: unknown): value is GoalType {
  return (
    typeof value === 'string' &&
    (GOAL_TYPES as readonly string[]).includes(value)
  );
}
