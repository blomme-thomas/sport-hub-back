import { InvalidFoodError } from '../errors/invalid-food.error.js';
import { FoodName } from './food-name.vo.js';

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('FoodName', () => {
  describe('lecture d’un nom valide', () => {
    it('restitue le nom fourni', () => {
      expect(FoodName.create('Riz basmati').toString()).toBe('Riz basmati');
    });

    it('retire les espaces en début et en fin de nom', () => {
      expect(FoodName.create('  Riz basmati  ').toString()).toBe('Riz basmati');
    });

    it('accepte un nom d’un seul caractère', () => {
      expect(FoodName.create('a').toString()).toBe('a');
    });

    it('accepte un nom de 200 caractères', () => {
      const name = 'a'.repeat(200);

      expect(FoodName.create(name).toString()).toBe(name);
    });

    it('accepte un nom de 200 caractères entouré d’espaces, les espaces ne comptant pas', () => {
      const name = 'a'.repeat(200);

      expect(FoodName.create(`  ${name}  `).toString()).toBe(name);
    });
  });

  describe('refus d’un nom invalide', () => {
    it.each([
      ['chaîne vide', ''],
      ['uniquement des espaces', '   '],
    ])('refuse un nom %s avec INVALID_FOOD', (_label, value) => {
      expect(() => FoodName.create(value)).toThrow(InvalidFoodError);
      expect(captureError(() => FoodName.create(value))).toMatchObject({
        code: 'INVALID_FOOD',
      });
    });

    it('refuse un nom de 201 caractères', () => {
      expect(() => FoodName.create('a'.repeat(201))).toThrow(InvalidFoodError);
    });

    it('refuse un nom de 201 caractères utiles même entouré d’espaces', () => {
      expect(() => FoodName.create(`  ${'a'.repeat(201)}  `)).toThrow(
        InvalidFoodError,
      );
    });
  });
});
