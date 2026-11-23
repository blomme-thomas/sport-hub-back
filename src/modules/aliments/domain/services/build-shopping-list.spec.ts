import { describe, expect, it } from 'vitest';
import { buildShoppingList } from './build-shopping-list.js';

describe('buildShoppingList', () => {
  it('additionne les quantités d’un même aliment sur la période', () => {
    const list = buildShoppingList([
      {
        foodId: 'riz',
        name: 'Riz',
        unit: 'g',
        categories: ['feculent'],
        quantity: 80,
      },
      {
        foodId: 'riz',
        name: 'Riz',
        unit: 'g',
        categories: ['feculent'],
        quantity: 120,
      },
    ]);

    expect(list).toHaveLength(1);
    expect(list[0]?.quantity).toBe(200);
    expect(list[0]?.quantityMissing).toBe(false);
  });

  it('trie par catégorie puis par nom, avec la catégorie « autre » en dernier', () => {
    const list = buildShoppingList([
      {
        foodId: 'h',
        name: 'Huile',
        unit: 'ml',
        categories: ['autre'],
        quantity: null,
      },
      {
        foodId: 'r',
        name: 'Riz',
        unit: 'g',
        categories: ['feculent'],
        quantity: 80,
      },
      {
        foodId: 'b',
        name: 'Brocoli',
        unit: 'g',
        categories: ['legume'],
        quantity: 100,
      },
      {
        foodId: 'p',
        name: 'Poulet',
        unit: 'g',
        categories: ['proteine'],
        quantity: 150,
      },
      {
        foodId: 'l',
        name: 'Lentilles',
        unit: 'g',
        categories: ['proteine', 'feculent'],
        quantity: 60,
      },
    ]);

    expect(list.map((item) => item.name)).toEqual([
      'Lentilles',
      'Poulet',
      'Brocoli',
      'Riz',
      'Huile',
    ]);
  });

  it('signale un aliment sans quantité et garde la somme des quantités connues', () => {
    const list = buildShoppingList([
      {
        foodId: 'h',
        name: 'Huile',
        unit: 'ml',
        categories: ['autre'],
        quantity: 10,
      },
      {
        foodId: 'h',
        name: 'Huile',
        unit: 'ml',
        categories: ['autre'],
        quantity: null,
      },
    ]);

    expect(list[0]?.quantity).toBe(10);
    expect(list[0]?.quantityMissing).toBe(true);
  });

  it('renvoie une liste vide sans ligne', () => {
    expect(buildShoppingList([])).toEqual([]);
  });
});
