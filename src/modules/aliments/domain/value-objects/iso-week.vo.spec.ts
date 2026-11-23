import { describe, expect, it } from 'vitest';
import { InvalidPlannedMealError } from '../errors/invalid-planned-meal.error.js';
import { IsoWeek } from './iso-week.vo.js';
import { MealDate } from './meal-date.vo.js';

describe('IsoWeek', () => {
  it('renvoie le lundi et le dimanche de la semaine ISO', () => {
    const week = IsoWeek.create('2026-W48');

    expect(week.start.toString()).toBe('2026-11-23');
    expect(week.end.toString()).toBe('2026-11-29');
  });

  it('gère la semaine 1 qui commence l’année précédente', () => {
    const week = IsoWeek.create('2025-W01');

    expect(week.start.toString()).toBe('2024-12-30');
    expect(week.end.toString()).toBe('2025-01-05');
  });

  it('refuse un format ou un numéro hors plage', () => {
    expect(() => IsoWeek.create('2026-48')).toThrow(InvalidPlannedMealError);
    expect(() => IsoWeek.create('2026-W54')).toThrow(InvalidPlannedMealError);
  });
});

describe('MealDate', () => {
  it('refuse une date inexistante', () => {
    expect(() => MealDate.create('2026-02-30')).toThrow(
      InvalidPlannedMealError,
    );
  });

  it('accepte une date réelle et ajoute des jours', () => {
    expect(MealDate.create('2028-02-28').addDays(1).toString()).toBe(
      '2028-02-29',
    );
  });
});
