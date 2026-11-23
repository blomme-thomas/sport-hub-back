import { describe, expect, it } from 'vitest';
import { NutritionValues } from '../value-objects/nutrition-values.vo.js';
import { summarizeRecipeNutrition } from './summarize-recipe-nutrition.js';

const POULET = NutritionValues.create({
  calories: 165,
  proteins: 31,
  carbohydrates: 0,
  fats: 3.6,
  sugars: 0,
});

const RIZ = NutritionValues.create({
  calories: 130,
  proteins: 2.7,
  carbohydrates: 28,
  fats: 0.3,
  sugars: 0.1,
});

const VIDE = NutritionValues.create({
  calories: null,
  proteins: null,
  carbohydrates: null,
  fats: null,
  sugars: null,
});

describe('summarizeRecipeNutrition', () => {
  it('additionne les aliments pondérés par leur quantité sur 100 g', () => {
    const summary = summarizeRecipeNutrition([
      { foodId: 'a', component: 'proteine', quantity: 150, per100g: POULET },
      { foodId: 'b', component: 'feculent', quantity: 80, per100g: RIZ },
    ]);

    expect(summary.totals).toEqual({
      calories: 351.5,
      proteins: 48.7,
      carbohydrates: 22.4,
      fats: 5.6,
      sugars: 0.1,
    });
    expect(summary.byComponent.proteine.calories).toBe(247.5);
    expect(summary.byComponent.feculent.calories).toBe(104);
    expect(summary.byComponent.legume.calories).toBe(0);
    expect(summary.ignored).toEqual([]);
  });

  it('compte deux fois un aliment présent deux fois', () => {
    const summary = summarizeRecipeNutrition([
      { foodId: 'a', component: null, quantity: 100, per100g: RIZ },
      { foodId: 'a', component: null, quantity: 100, per100g: RIZ },
    ]);

    expect(summary.totals.calories).toBe(260);
  });

  it('ignore et signale un aliment sans quantité', () => {
    const summary = summarizeRecipeNutrition([
      { foodId: 'a', component: null, quantity: null, per100g: RIZ },
    ]);

    expect(summary.totals.calories).toBe(0);
    expect(summary.ignored).toEqual([
      { foodId: 'a', reason: 'quantity-missing' },
    ]);
  });

  it('ignore et signale un aliment sans valeur nutritionnelle', () => {
    const summary = summarizeRecipeNutrition([
      { foodId: 'b', component: 'legume', quantity: 100, per100g: VIDE },
      { foodId: 'c', component: null, quantity: 100, per100g: RIZ },
    ]);

    expect(summary.totals.calories).toBe(130);
    expect(summary.ignored).toEqual([
      { foodId: 'b', reason: 'nutrition-missing' },
    ]);
  });

  it('renvoie une synthèse nulle pour une recette sans aliment', () => {
    const summary = summarizeRecipeNutrition([]);

    expect(summary.totals).toEqual({
      calories: 0,
      proteins: 0,
      carbohydrates: 0,
      fats: 0,
      sugars: 0,
    });
    expect(summary.ignored).toEqual([]);
  });
});
