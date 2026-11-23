export const FOOD_CATEGORIES = [
  'proteine',
  'legume',
  'feculent',
  'autre',
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export function isFoodCategory(value: unknown): value is FoodCategory {
  return (
    typeof value === 'string' &&
    (FOOD_CATEGORIES as readonly string[]).includes(value)
  );
}
