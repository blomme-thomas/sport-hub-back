import type { NutritionValues } from '../value-objects/nutrition-values.vo.js';
import type { RecipeComponent } from '../value-objects/recipe-component.vo.js';

export const NUTRIENT_KEYS = [
  'calories',
  'proteins',
  'carbohydrates',
  'fats',
  'sugars',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export type NutrientTotals = Record<NutrientKey, number>;

export type NutritionGroup = RecipeComponent | 'libre';

export interface NutritionLine {
  foodId: string;
  component: RecipeComponent | null;
  quantity: number | null;
  per100g: NutritionValues;
}

export interface IgnoredNutritionLine {
  foodId: string;
  reason: 'quantity-missing' | 'nutrition-missing';
}

export interface RecipeNutritionSummary {
  totals: NutrientTotals;
  byComponent: Record<NutritionGroup, NutrientTotals>;
  ignored: IgnoredNutritionLine[];
}

/**
 * Calcule la synthèse nutritionnelle d'une recette : somme des aliments pondérés par leur quantité (valeurs pour 100 g).
 * Un item sans quantité ou dont une valeur nutritionnelle est vide est ignoré et signalé ; une recette sans item donne une synthèse nulle.
 */
export function summarizeRecipeNutrition(
  lines: readonly NutritionLine[],
): RecipeNutritionSummary {
  const summary: RecipeNutritionSummary = {
    totals: emptyTotals(),
    byComponent: {
      proteine: emptyTotals(),
      legume: emptyTotals(),
      feculent: emptyTotals(),
      libre: emptyTotals(),
    },
    ignored: [],
  };
  for (const line of lines) {
    if (line.quantity === null) {
      summary.ignored.push({ foodId: line.foodId, reason: 'quantity-missing' });
      continue;
    }
    const contribution = contributionOf(line.per100g, line.quantity);
    if (contribution === null) {
      summary.ignored.push({
        foodId: line.foodId,
        reason: 'nutrition-missing',
      });
      continue;
    }
    const group = line.component ?? 'libre';
    addInto(summary.totals, contribution);
    addInto(summary.byComponent[group], contribution);
  }
  summary.totals = roundTotals(summary.totals);
  for (const group of Object.keys(summary.byComponent) as NutritionGroup[]) {
    summary.byComponent[group] = roundTotals(summary.byComponent[group]);
  }
  return summary;
}

function contributionOf(
  values: NutritionValues,
  quantity: number,
): NutrientTotals | null {
  const factor = quantity / 100;
  const entries = NUTRIENT_KEYS.map((key) => {
    const value = values[key];
    return [key, value === null ? null : value * factor] as const;
  });
  if (entries.some(([, value]) => value === null)) {
    return null;
  }
  return Object.fromEntries(entries) as NutrientTotals;
}

function addInto(target: NutrientTotals, value: NutrientTotals): void {
  for (const key of NUTRIENT_KEYS) {
    target[key] += value[key];
  }
}

function roundTotals(totals: NutrientTotals): NutrientTotals {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [key, Math.round(totals[key] * 10) / 10]),
  ) as NutrientTotals;
}

function emptyTotals(): NutrientTotals {
  return { calories: 0, proteins: 0, carbohydrates: 0, fats: 0, sugars: 0 };
}
