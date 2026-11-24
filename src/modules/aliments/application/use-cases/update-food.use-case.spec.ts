import { Test } from '@nestjs/testing';
import { Food } from '../../domain/entities/food.entity.js';
import { FoodNotFoundError } from '../../domain/errors/food-not-found.error.js';
import { InvalidFoodError } from '../../domain/errors/invalid-food.error.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import type { FoodId } from '../../domain/value-objects/food-id.vo.js';
import type { FoodCategory } from '../../domain/value-objects/food-category.vo.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { UpdateFoodUseCase } from './update-food.use-case.js';

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

function seededFood(): Food {
  return Food.create({
    name: FoodName.create('Riz basmati'),
    unit: FoodUnit.create('g'),
    categories: ['feculent'],
    nutrition: NutritionValues.create({
      calories: 350,
      proteins: 7,
      carbohydrates: 78,
      fats: 0.6,
      sugars: 0.1,
    }),
  });
}

const SEEDED_DTO_WITHOUT_ID = {
  name: 'Riz basmati',
  unit: 'g',
  categories: ['feculent'],
  calories: 350,
  proteins: 7,
  carbohydrates: 78,
  fats: 0.6,
  sugars: 0.1,
};

describe('UpdateFoodUseCase', () => {
  let useCase: UpdateFoodUseCase;
  let repository: FakeFoodRepository;
  let food: Food;
  let id: string;

  beforeEach(async () => {
    repository = new FakeFoodRepository();
    food = seededFood();
    id = food.id.toString();
    await repository.save(food);
    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateFoodUseCase,
        { provide: FOOD_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(UpdateFoodUseCase);
  });

  describe('modification réussie', () => {
    it('renvoie l’aliment inchangé quand la modification est vide', async () => {
      const result = await useCase.execute({ id });

      expect(result).toEqual({ id, ...SEEDED_DTO_WITHOUT_ID });
    });

    it('met à jour le nom et retire les espaces autour', async () => {
      const result = await useCase.execute({ id, name: '  Quinoa  ' });

      expect(result.name).toBe('Quinoa');
    });

    it('met à jour l’unité', async () => {
      const result = await useCase.execute({ id, unit: 'pièce' });

      expect(result.unit).toBe('pièce');
    });

    it('conserve les catégories quand le champ est absent', async () => {
      const result = await useCase.execute({ id, name: 'Quinoa' });

      expect(result.categories).toEqual(['feculent']);
    });

    it('remplace l’ensemble des catégories', async () => {
      const result = await useCase.execute({
        id,
        categories: ['proteine', 'legume'],
      });

      expect(result.categories).toEqual(['proteine', 'legume']);
    });

    it('dédoublonne les catégories fournies', async () => {
      const result = await useCase.execute({
        id,
        categories: ['legume', 'legume', 'proteine'],
      });

      expect(result.categories).toEqual(['legume', 'proteine']);
    });

    it('conserve les valeurs nutritionnelles absentes de la modification', async () => {
      const result = await useCase.execute({ id, proteins: 12 });

      expect(result.calories).toBe(350);
      expect(result.carbohydrates).toBe(78);
      expect(result.fats).toBe(0.6);
      expect(result.sugars).toBe(0.1);
    });

    it('remplace une valeur nutritionnelle fournie', async () => {
      const result = await useCase.execute({ id, proteins: 12 });

      expect(result.proteins).toBe(12);
    });

    it('efface une valeur nutritionnelle fournie à null', async () => {
      const result = await useCase.execute({ id, calories: null });

      expect(result.calories).toBeNull();
      expect(result.proteins).toBe(7);
    });

    it('persiste la modification sous le même identifiant', async () => {
      await useCase.execute({ id, name: 'Quinoa', calories: null });

      expect(repository.foods.size).toBe(1);
      expect(repository.foods.get(id)?.name.toString()).toBe('Quinoa');
      expect(repository.foods.get(id)?.nutrition.calories).toBeNull();
    });
  });

  describe('refus sans modification', () => {
    it('refuse un nom vide avec INVALID_FOOD et conserve l’aliment', async () => {
      await expect(useCase.execute({ id, name: '   ' })).rejects.toBeInstanceOf(
        InvalidFoodError,
      );

      expect(repository.foods.get(id)?.name.toString()).toBe('Riz basmati');
    });

    it('refuse une unité de plus de 20 caractères', async () => {
      await expect(
        useCase.execute({ id, unit: 'a'.repeat(21) }),
      ).rejects.toBeInstanceOf(InvalidFoodError);
    });

    it('refuse une liste de catégories vide avec INVALID_FOOD et conserve les catégories', async () => {
      await expect(
        useCase.execute({ id, categories: [] }),
      ).rejects.toMatchObject({ code: 'INVALID_FOOD' });

      expect(repository.foods.get(id)?.categories).toEqual(['feculent']);
    });

    it('refuse une catégorie inconnue avec INVALID_FOOD', async () => {
      await expect(
        useCase.execute({
          id,
          categories: ['fruit' as unknown as FoodCategory],
        }),
      ).rejects.toMatchObject({ code: 'INVALID_FOOD' });
    });

    it('refuse une valeur nutritionnelle négative avec INVALID_FOOD et conserve la valeur', async () => {
      await expect(
        useCase.execute({ id, calories: -1 }),
      ).rejects.toBeInstanceOf(InvalidFoodError);

      expect(repository.foods.get(id)?.nutrition.calories).toBe(350);
    });

    it('refuse un identifiant mal formé avec INVALID_FOOD', async () => {
      await expect(
        useCase.execute({ id: 'riz', name: 'Quinoa' }),
      ).rejects.toMatchObject({ code: 'INVALID_FOOD' });
    });

    it('refuse un identifiant inconnu avec FOOD_NOT_FOUND', async () => {
      await expect(
        useCase.execute({ id: UNKNOWN_ID, name: 'Quinoa' }),
      ).rejects.toBeInstanceOf(FoodNotFoundError);
      await expect(
        useCase.execute({ id: UNKNOWN_ID, name: 'Quinoa' }),
      ).rejects.toMatchObject({ code: 'FOOD_NOT_FOUND' });
    });

    it('ne crée pas d’aliment quand l’identifiant est inconnu', async () => {
      await useCase
        .execute({ id: UNKNOWN_ID, name: 'Quinoa' })
        .catch(() => undefined);

      expect(repository.foods.size).toBe(1);
      expect(repository.foods.has(UNKNOWN_ID)).toBe(false);
    });
  });
});
