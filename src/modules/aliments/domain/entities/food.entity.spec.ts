import { InvalidFoodError } from '../errors/invalid-food.error.js';
import { FoodId } from '../value-objects/food-id.vo.js';
import { FoodName } from '../value-objects/food-name.vo.js';
import { FoodUnit } from '../value-objects/food-unit.vo.js';
import { NutritionValues } from '../value-objects/nutrition-values.vo.js';
import { Food } from './food.entity.js';

type FoodInput = Parameters<typeof Food.create>[0];
type NutritionOverrides = Partial<Record<keyof NutritionInput, number | null>>;
type NutritionInput = Parameters<typeof NutritionValues.create>[0];

const FOOD_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nutrition(overrides: NutritionOverrides = {}): NutritionValues {
  return NutritionValues.create({
    calories: null,
    proteins: null,
    carbohydrates: null,
    fats: null,
    sugars: null,
    ...overrides,
  });
}

function props(overrides: Partial<FoodInput> = {}): FoodInput {
  return {
    name: FoodName.create('Riz basmati'),
    unit: FoodUnit.create('g'),
    categories: ['feculent'],
    nutrition: nutrition({
      calories: 350,
      proteins: 7,
      carbohydrates: 78,
      fats: 0.6,
      sugars: 0.1,
    }),
    ...overrides,
  };
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('Food', () => {
  describe('création', () => {
    it('expose le nom, l’unité, les catégories et les valeurs fournis', () => {
      const food = Food.create(props());

      expect(food.name.toString()).toBe('Riz basmati');
      expect(food.unit.toString()).toBe('g');
      expect(food.categories).toEqual(['feculent']);
      expect(food.nutrition.calories).toBe(350);
      expect(food.nutrition.sugars).toBe(0.1);
    });

    it('attribue un identifiant au format UUID', () => {
      const food = Food.create(props());

      expect(food.id.toString()).toMatch(UUID_PATTERN);
    });

    it('attribue un identifiant distinct à chaque création', () => {
      const first = Food.create(props());
      const second = Food.create(props());

      expect(first.id.toString()).not.toBe(second.id.toString());
    });

    it('accepte des valeurs nutritionnelles toutes vides', () => {
      const food = Food.create(
        props({ categories: ['autre'], nutrition: nutrition() }),
      );

      expect(food.nutrition.calories).toBeNull();
      expect(food.nutrition.proteins).toBeNull();
      expect(food.nutrition.carbohydrates).toBeNull();
      expect(food.nutrition.fats).toBeNull();
      expect(food.nutrition.sugars).toBeNull();
    });

    it('accepte plusieurs catégories', () => {
      const food = Food.create(props({ categories: ['proteine', 'legume'] }));

      expect(food.categories).toEqual(['proteine', 'legume']);
    });

    it('dédoublonne les catégories répétées en gardant leur premier ordre d’apparition', () => {
      const food = Food.create(
        props({ categories: ['legume', 'proteine', 'legume'] }),
      );

      expect(food.categories).toEqual(['legume', 'proteine']);
    });

    it('refuse un aliment sans aucune catégorie avec INVALID_FOOD', () => {
      const error = captureError(() => Food.create(props({ categories: [] })));

      expect(error).toBeInstanceOf(InvalidFoodError);
      expect(error).toMatchObject({ code: 'INVALID_FOOD' });
    });
  });

  describe('reconstitution', () => {
    it('restitue l’identifiant fourni et les valeurs enregistrées', () => {
      const food = Food.reconstitute({
        id: FoodId.from(FOOD_ID),
        name: FoodName.create('Riz basmati'),
        unit: FoodUnit.create('g'),
        categories: ['feculent'],
        nutrition: nutrition({ calories: 350 }),
      });

      expect(food.id.toString()).toBe(FOOD_ID);
      expect(food.name.toString()).toBe('Riz basmati');
      expect(food.nutrition.calories).toBe(350);
      expect(food.nutrition.proteins).toBeNull();
    });

    it('refuse une reconstitution sans catégorie avec INVALID_FOOD', () => {
      expect(() =>
        Food.reconstitute({
          id: FoodId.from(FOOD_ID),
          name: FoodName.create('Riz basmati'),
          unit: FoodUnit.create('g'),
          categories: [],
          nutrition: nutrition(),
        }),
      ).toThrow(InvalidFoodError);
    });
  });

  describe('modification', () => {
    it('renvoie une nouvelle instance portant le changement demandé', () => {
      const food = Food.create(props());

      const changed = food.change({ name: FoodName.create('Quinoa') });

      expect(changed).not.toBe(food);
      expect(changed.name.toString()).toBe('Quinoa');
    });

    it('conserve l’identifiant lors d’une modification', () => {
      const food = Food.reconstitute({
        id: FoodId.from(FOOD_ID),
        name: FoodName.create('Riz basmati'),
        unit: FoodUnit.create('g'),
        categories: ['feculent'],
        nutrition: nutrition(),
      });

      const changed = food.change({ unit: FoodUnit.create('pièce') });

      expect(changed.id.toString()).toBe(FOOD_ID);
    });

    it('ne modifie pas l’instance d’origine', () => {
      const food = Food.create(props());

      food.change({ name: FoodName.create('Quinoa') });

      expect(food.name.toString()).toBe('Riz basmati');
    });

    it('conserve les champs non modifiés', () => {
      const food = Food.create(props());

      const changed = food.change({ name: FoodName.create('Quinoa') });

      expect(changed.unit.toString()).toBe('g');
      expect(changed.categories).toEqual(['feculent']);
      expect(changed.nutrition.calories).toBe(350);
    });

    it('remplace l’ensemble des catégories', () => {
      const food = Food.create(props());

      const changed = food.change({ categories: ['proteine', 'autre'] });

      expect(changed.categories).toEqual(['proteine', 'autre']);
    });

    it('dédoublonne les catégories lors d’un remplacement', () => {
      const food = Food.create(props());

      const changed = food.change({
        categories: ['legume', 'legume', 'feculent'],
      });

      expect(changed.categories).toEqual(['legume', 'feculent']);
    });

    it('remplace l’ensemble des valeurs nutritionnelles', () => {
      const food = Food.create(props());

      const changed = food.change({ nutrition: nutrition({ calories: 120 }) });

      expect(changed.nutrition.calories).toBe(120);
      expect(changed.nutrition.proteins).toBeNull();
      expect(changed.nutrition.sugars).toBeNull();
    });

    it('renvoie un aliment équivalent quand le changement est vide', () => {
      const food = Food.create(props());

      const changed = food.change({});

      expect(changed.name.toString()).toBe(food.name.toString());
      expect(changed.categories).toEqual(food.categories);
      expect(changed.nutrition.calories).toBe(food.nutrition.calories);
    });

    it('refuse un changement qui retire toutes les catégories avec INVALID_FOOD', () => {
      const food = Food.create(props());

      expect(() => food.change({ categories: [] })).toThrow(InvalidFoodError);
    });

    it('conserve les catégories d’origine après un changement refusé', () => {
      const food = Food.create(props());

      expect(() => food.change({ categories: [] })).toThrow(InvalidFoodError);
      expect(food.categories).toEqual(['feculent']);
    });
  });
});
