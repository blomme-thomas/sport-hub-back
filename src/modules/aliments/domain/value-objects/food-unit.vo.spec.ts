import { InvalidFoodError } from '../errors/invalid-food.error.js';
import { FoodUnit } from './food-unit.vo.js';

describe('FoodUnit', () => {
  describe('lecture d’une unité valide', () => {
    it('restitue l’unité fournie', () => {
      expect(FoodUnit.create('g').toString()).toBe('g');
    });

    it('accepte une unité libre composée de plusieurs mots', () => {
      expect(FoodUnit.create('cuillère à soupe').toString()).toBe(
        'cuillère à soupe',
      );
    });

    it('retire les espaces en début et en fin d’unité', () => {
      expect(FoodUnit.create('  pièce  ').toString()).toBe('pièce');
    });

    it('accepte une unité de 20 caractères', () => {
      const unit = 'a'.repeat(20);

      expect(FoodUnit.create(unit).toString()).toBe(unit);
    });

    it('accepte une unité de 20 caractères utiles entourée d’espaces', () => {
      const unit = 'a'.repeat(20);

      expect(FoodUnit.create(` ${unit} `).toString()).toBe(unit);
    });
  });

  describe('refus d’une unité invalide', () => {
    it.each([
      ['chaîne vide', ''],
      ['uniquement des espaces', '   '],
    ])('refuse une unité %s avec INVALID_FOOD', (_label, value) => {
      expect(() => FoodUnit.create(value)).toThrow(InvalidFoodError);
    });

    it('refuse une unité de 21 caractères', () => {
      expect(() => FoodUnit.create('a'.repeat(21))).toThrow(InvalidFoodError);
    });

    it('refuse une unité de 21 caractères utiles entourée d’espaces', () => {
      expect(() => FoodUnit.create(` ${'a'.repeat(21)} `)).toThrow(
        InvalidFoodError,
      );
    });
  });
});
