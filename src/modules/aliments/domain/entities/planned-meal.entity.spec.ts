import { describe, expect, it } from 'vitest';
import { InvalidPlannedMealError } from '../errors/invalid-planned-meal.error.js';
import { PlannedMeal } from './planned-meal.entity.js';

const RECIPE_ID = '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e';

describe('PlannedMeal', () => {
  it('se crée avec une recette, une date et un repas', () => {
    const plannedMeal = PlannedMeal.create({
      recipeId: RECIPE_ID,
      date: '2026-11-25',
      mealTag: 'midi',
    });

    expect(plannedMeal.recipeId.toString()).toBe(RECIPE_ID);
    expect(plannedMeal.date.toString()).toBe('2026-11-25');
    expect(plannedMeal.mealTag).toBe('midi');
  });

  it('refuse un repas inconnu', () => {
    expect(() =>
      PlannedMeal.create({
        recipeId: RECIPE_ID,
        date: '2026-11-25',
        mealTag: 'goûter',
      }),
    ).toThrow(InvalidPlannedMealError);
  });

  it('déplace le repas en gardant son identifiant', () => {
    const original = PlannedMeal.create({
      recipeId: RECIPE_ID,
      date: '2026-11-25',
      mealTag: 'midi',
    });

    const moved = original.move({ date: '2026-11-26', mealTag: 'soir' });

    expect(moved.id.equals(original.id)).toBe(true);
    expect(moved.date.toString()).toBe('2026-11-26');
    expect(moved.mealTag).toBe('soir');
    expect(original.date.toString()).toBe('2026-11-25');
  });
});
