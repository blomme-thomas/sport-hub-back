export const RECIPE_COMPONENTS = ['proteine', 'legume', 'feculent'] as const;

export type RecipeComponent = (typeof RECIPE_COMPONENTS)[number];

export function isRecipeComponent(value: unknown): value is RecipeComponent {
  return (
    typeof value === 'string' &&
    (RECIPE_COMPONENTS as readonly string[]).includes(value)
  );
}
