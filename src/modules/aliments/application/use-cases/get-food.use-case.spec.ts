import { Test } from '@nestjs/testing';
import { Food } from '../../domain/entities/food.entity.js';
import { FoodNotFoundError } from '../../domain/errors/food-not-found.error.js';
import { InvalidFoodError } from '../../domain/errors/invalid-food.error.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import type { FoodId } from '../../domain/value-objects/food-id.vo.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { GetFoodUseCase } from './get-food.use-case.js';

const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

class FakeFoodRepository implements IFoodRepository {
  readonly foods = new Map<string, Food>();

  findById(id: FoodId): Promise<Food | null> {
    return Promise.resolve(this.foods.get(id.toString()) ?? null);
  }

  save(food: Food): Promise<void> {
    this.foods.set(food.id.toString(), food);
    return Promise.resolve();
  }

  isUsedInRecipe(): Promise<boolean> {
    return Promise.resolve(false);
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

function food(
  name: string,
  categories: Food['categories'],
  calories: number | null,
): Food {
  return Food.create({
    name: FoodName.create(name),
    unit: FoodUnit.create('g'),
    categories,
    nutrition: NutritionValues.create({
      calories,
      proteins: null,
      carbohydrates: null,
      fats: null,
      sugars: null,
    }),
  });
}

describe('GetFoodUseCase', () => {
  let useCase: GetFoodUseCase;
  let repository: FakeFoodRepository;

  beforeEach(async () => {
    repository = new FakeFoodRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetFoodUseCase,
        { provide: FOOD_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(GetFoodUseCase);
  });

  describe('lecture réussie', () => {
    it('renvoie l’aliment demandé avec ses valeurs', async () => {
      const riz = food('Riz basmati', ['feculent'], 350);
      await repository.save(riz);

      const result = await useCase.execute({ id: riz.id.toString() });

      expect(result).toEqual({
        id: riz.id.toString(),
        name: 'Riz basmati',
        unit: 'g',
        categories: ['feculent'],
        calories: 350,
        proteins: null,
        carbohydrates: null,
        fats: null,
        sugars: null,
      });
    });

    it('renvoie uniquement l’aliment demandé parmi plusieurs', async () => {
      const riz = food('Riz basmati', ['feculent'], 350);
      const poulet = food('Poulet', ['proteine'], 165);
      await repository.save(riz);
      await repository.save(poulet);

      const result = await useCase.execute({ id: poulet.id.toString() });

      expect(result.name).toBe('Poulet');
      expect(result.categories).toEqual(['proteine']);
    });

    it('renvoie les catégories multiples d’un aliment', async () => {
      const oeufs = food('Oeufs', ['proteine', 'autre'], null);
      await repository.save(oeufs);

      const result = await useCase.execute({ id: oeufs.id.toString() });

      expect(result.categories).toEqual(['proteine', 'autre']);
    });

    it('renvoie les valeurs nutritionnelles vides à null', async () => {
      const sel = food('Sel', ['autre'], null);
      await repository.save(sel);

      const result = await useCase.execute({ id: sel.id.toString() });

      expect(result.calories).toBeNull();
      expect(result.proteins).toBeNull();
    });
  });

  describe('refus de lecture', () => {
    it('refuse un identifiant inconnu avec FOOD_NOT_FOUND', async () => {
      await expect(useCase.execute({ id: UNKNOWN_ID })).rejects.toBeInstanceOf(
        FoodNotFoundError,
      );
      await expect(useCase.execute({ id: UNKNOWN_ID })).rejects.toMatchObject({
        code: 'FOOD_NOT_FOUND',
      });
    });

    it('refuse un identifiant mal formé avec INVALID_FOOD plutôt que FOOD_NOT_FOUND', async () => {
      await expect(useCase.execute({ id: 'riz' })).rejects.toBeInstanceOf(
        InvalidFoodError,
      );
      await expect(useCase.execute({ id: 'riz' })).rejects.toMatchObject({
        code: 'INVALID_FOOD',
      });
    });
  });
});
