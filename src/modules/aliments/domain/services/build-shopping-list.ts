import type { FoodCategory } from '../value-objects/food-category.vo.js';

/** Ordre d'affichage des catégories dans la liste de courses. */
export const SHOPPING_CATEGORY_ORDER: readonly FoodCategory[] = [
  'proteine',
  'legume',
  'feculent',
  'autre',
];

export interface ShoppingLine {
  foodId: string;
  name: string;
  unit: string;
  categories: readonly FoodCategory[];
  quantity: number | null;
}

export interface ShoppingListItem {
  foodId: string;
  name: string;
  unit: string;
  category: FoodCategory;
  quantity: number | null;
  quantityMissing: boolean;
}

/**
 * Additionne les quantités par aliment (une ligne = une occurrence dans le planning), puis trie par catégorie puis par nom.
 * Un aliment dont une occurrence n'a pas de quantité est signalé `quantityMissing` ; sa quantité est la somme des quantités connues.
 */
export function buildShoppingList(
  lines: readonly ShoppingLine[],
): ShoppingListItem[] {
  const byFood = new Map<string, ShoppingListItem>();
  for (const line of lines) {
    const existing = byFood.get(line.foodId);
    const category = primaryCategory(line.categories);
    if (existing === undefined) {
      byFood.set(line.foodId, {
        foodId: line.foodId,
        name: line.name,
        unit: line.unit,
        category,
        quantity: line.quantity,
        quantityMissing: line.quantity === null,
      });
      continue;
    }
    existing.quantity = addQuantities(existing.quantity, line.quantity);
    existing.quantityMissing =
      existing.quantityMissing || line.quantity === null;
  }
  return [...byFood.values()].sort(
    (a, b) =>
      SHOPPING_CATEGORY_ORDER.indexOf(a.category) -
        SHOPPING_CATEGORY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name, 'fr'),
  );
}

function primaryCategory(categories: readonly FoodCategory[]): FoodCategory {
  return (
    SHOPPING_CATEGORY_ORDER.find((category) => categories.includes(category)) ??
    'autre'
  );
}

function addQuantities(
  total: number | null,
  value: number | null,
): number | null {
  if (value === null) {
    return total;
  }
  return Math.round(((total ?? 0) + value) * 100) / 100;
}
