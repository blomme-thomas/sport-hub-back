import { FOOD_CATEGORIES, isFoodCategory } from './food-category.vo.js';

describe('FoodCategory', () => {
  describe('catégories connues', () => {
    it('propose les catégories protéine, légume, féculent et autre', () => {
      expect([...FOOD_CATEGORIES]).toEqual([
        'proteine',
        'legume',
        'feculent',
        'autre',
      ]);
    });

    it.each(['proteine', 'legume', 'feculent', 'autre'])(
      'reconnaît %s comme une catégorie',
      (value) => {
        expect(isFoodCategory(value)).toBe(true);
      },
    );
  });

  describe('catégories inconnues', () => {
    it.each([
      ['chaîne vide', ''],
      ['catégorie hors liste', 'fruit'],
      ['pluriel', 'legumes'],
      ['texte proche', 'autres'],
    ])('ne reconnaît pas %s (%s)', (_label, value) => {
      expect(isFoodCategory(value)).toBe(false);
    });
  });
});
