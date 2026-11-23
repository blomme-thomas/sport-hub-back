import { InvalidFoodError } from '../errors/invalid-food.error.js';
import { FoodId } from './food-id.vo.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOOD_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const OTHER_FOOD_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('FoodId', () => {
  describe('génération', () => {
    it('produit un identifiant au format UUID', () => {
      expect(FoodId.generate().toString()).toMatch(UUID_PATTERN);
    });

    it('attribue un identifiant distinct à chaque génération', () => {
      expect(FoodId.generate().toString()).not.toBe(
        FoodId.generate().toString(),
      );
    });
  });

  describe('lecture depuis une valeur', () => {
    it('restitue la valeur fournie', () => {
      expect(FoodId.from(FOOD_ID).toString()).toBe(FOOD_ID);
    });

    it('est égal à un identifiant de même valeur', () => {
      expect(FoodId.from(FOOD_ID).equals(FoodId.from(FOOD_ID))).toBe(true);
    });

    it('n’est pas égal à un identifiant de valeur différente', () => {
      expect(FoodId.from(FOOD_ID).equals(FoodId.from(OTHER_FOOD_ID))).toBe(
        false,
      );
    });

    it.each([
      ['chaîne vide', ''],
      ['texte libre', 'riz'],
      ['UUID tronqué', '0f8fad5b-d9cb-469f-a165-70867728950'],
      ['UUID sans tirets', '0f8fad5bd9cb469fa16570867728950e'],
    ])('refuse %s (%s) avec INVALID_FOOD', (_label, value) => {
      expect(captureError(() => FoodId.from(value))).toBeInstanceOf(
        InvalidFoodError,
      );
      expect(captureError(() => FoodId.from(value))).toMatchObject({
        code: 'INVALID_FOOD',
      });
    });
  });
});
