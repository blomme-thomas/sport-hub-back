import { InvalidFoodError } from '../errors/invalid-food.error.js';
import { NutritionValues } from './nutrition-values.vo.js';

const FIELDS = [
  'calories',
  'proteins',
  'carbohydrates',
  'fats',
  'sugars',
] as const;

type NutritionField = (typeof FIELDS)[number];

function values(
  overrides: Partial<Record<NutritionField, number | null>> = {},
): NutritionValues {
  return NutritionValues.create({
    calories: null,
    proteins: null,
    carbohydrates: null,
    fats: null,
    sugars: null,
    ...overrides,
  });
}

describe('NutritionValues', () => {
  describe('valeurs vides', () => {
    it('accepte l’absence de toutes les valeurs', () => {
      const nutrition = values();

      expect(nutrition.calories).toBeNull();
      expect(nutrition.proteins).toBeNull();
      expect(nutrition.carbohydrates).toBeNull();
      expect(nutrition.fats).toBeNull();
      expect(nutrition.sugars).toBeNull();
    });

    it('accepte des valeurs partiellement renseignées', () => {
      const nutrition = values({ calories: 350, sugars: null });

      expect(nutrition.calories).toBe(350);
      expect(nutrition.sugars).toBeNull();
    });
  });

  describe('valeurs valides', () => {
    it('expose les valeurs fournies pour chaque champ', () => {
      const nutrition = NutritionValues.create({
        calories: 350,
        proteins: 7,
        carbohydrates: 78,
        fats: 0.6,
        sugars: 0.1,
      });

      expect(nutrition.calories).toBe(350);
      expect(nutrition.proteins).toBe(7);
      expect(nutrition.carbohydrates).toBe(78);
      expect(nutrition.fats).toBe(0.6);
      expect(nutrition.sugars).toBe(0.1);
    });

    it.each(FIELDS)('accepte zéro pour le champ %s', (field) => {
      expect(values({ [field]: 0 })[field]).toBe(0);
    });

    it.each(FIELDS)('accepte une valeur décimale pour le champ %s', (field) => {
      expect(values({ [field]: 12.5 })[field]).toBe(12.5);
    });

    it('accepte une valeur très élevée, sans borne supérieure', () => {
      expect(values({ calories: 1_000_000 }).calories).toBe(1_000_000);
    });
  });

  describe('valeurs refusées', () => {
    it.each(FIELDS)(
      'refuse une valeur négative pour le champ %s avec INVALID_FOOD',
      (field) => {
        expect(() => values({ [field]: -1 })).toThrow(InvalidFoodError);
      },
    );

    it.each([
      ['NaN', Number.NaN],
      ['infini positif', Number.POSITIVE_INFINITY],
      ['infini négatif', Number.NEGATIVE_INFINITY],
    ])('refuse la valeur %s pour les calories', (_label, value) => {
      expect(() => values({ calories: value })).toThrow(InvalidFoodError);
    });

    it('refuse une valeur non finie pour un champ autre que les calories', () => {
      expect(() => values({ fats: Number.NaN })).toThrow(InvalidFoodError);
    });
  });
});
