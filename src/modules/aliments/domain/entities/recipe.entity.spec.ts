import { describe, expect, it } from 'vitest';
import { InvalidRecipeError } from '../errors/invalid-recipe.error.js';
import { RecipeName } from '../value-objects/recipe-name.vo.js';
import { Recipe } from './recipe.entity.js';

const FOOD_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function base() {
  return {
    name: RecipeName.create('Riz au poulet'),
    mealTags: ['midi', 'soir'],
    items: [{ foodId: FOOD_ID, component: 'feculent', quantity: 120 }],
  };
}

describe('Recipe', () => {
  it('se crée sans composant obligatoire et garde ses tags', () => {
    const recipe = Recipe.create({ ...base(), items: [] });

    expect(recipe.name.toString()).toBe('Riz au poulet');
    expect(recipe.mealTags).toEqual(['midi', 'soir']);
    expect(recipe.items).toEqual([]);
  });

  it('retire les tags de repas en double', () => {
    const recipe = Recipe.create({ ...base(), mealTags: ['midi', 'midi'] });

    expect(recipe.mealTags).toEqual(['midi']);
  });

  it('refuse une recette sans tag de repas', () => {
    expect(() => Recipe.create({ ...base(), mealTags: [] })).toThrow(
      InvalidRecipeError,
    );
  });

  it('refuse un tag de repas inconnu', () => {
    expect(() => Recipe.create({ ...base(), mealTags: ['goûter'] })).toThrow(
      InvalidRecipeError,
    );
  });

  it('refuse un composant inconnu', () => {
    expect(() =>
      Recipe.create({
        ...base(),
        items: [{ foodId: FOOD_ID, component: 'dessert', quantity: null }],
      }),
    ).toThrow(InvalidRecipeError);
  });

  it('refuse une quantité nulle ou négative, accepte une quantité vide', () => {
    expect(() =>
      Recipe.create({
        ...base(),
        items: [{ foodId: FOOD_ID, component: null, quantity: 0 }],
      }),
    ).toThrow(InvalidRecipeError);
    expect(() =>
      Recipe.create({
        ...base(),
        items: [{ foodId: FOOD_ID, component: null, quantity: -5 }],
      }),
    ).toThrow(InvalidRecipeError);

    const recipe = Recipe.create({
      ...base(),
      items: [{ foodId: FOOD_ID, component: null, quantity: null }],
    });
    expect(recipe.items[0]?.quantity).toBeNull();
  });

  it('change remplace la composition sans modifier l’original', () => {
    const original = Recipe.create(base());

    const changed = original.change({ items: [] });

    expect(changed.items).toEqual([]);
    expect(original.items).toHaveLength(1);
    expect(changed.id.equals(original.id)).toBe(true);
  });
});
