export const MEAL_TAGS = ['matin', 'midi', 'soir'] as const;

export type MealTag = (typeof MEAL_TAGS)[number];

export function isMealTag(value: unknown): value is MealTag {
  return (
    typeof value === 'string' &&
    (MEAL_TAGS as readonly string[]).includes(value)
  );
}
