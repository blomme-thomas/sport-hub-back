import { Test } from '@nestjs/testing';
import type { Food } from '../../domain/entities/food.entity.js';
import { InvalidFoodError } from '../../domain/errors/invalid-food.error.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import type { FoodId } from '../../domain/value-objects/food-id.vo.js';
import type { FoodCategory } from '../../domain/value-objects/food-category.vo.js';
import type { CreateFoodCommand } from '../dtos/food.dto.js';
import { CreateFoodUseCase } from './create-food.use-case.js';

const RIZ: CreateFoodCommand = {
  name: 'Riz basmati',
  unit: 'g',
  categories: ['feculent'],
  calories: 350,
  proteins: 7,
  carbohydrates: 78,
  fats: 0.6,
  sugars: 0.1,
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

describe('CreateFoodUseCase', () => {
  let useCase: CreateFoodUseCase;
  let repository: FakeFoodRepository;

  beforeEach(async () => {
    repository = new FakeFoodRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFoodUseCase,
        { provide: FOOD_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(CreateFoodUseCase);
  });

  describe('création réussie', () => {
    it('renvoie l’aliment créé avec un identifiant généré au format UUID', async () => {
      const result = await useCase.execute(RIZ);

      expect(result.id).toMatch(UUID_PATTERN);
      expect(result).toEqual({ ...RIZ, id: result.id });
    });

    it('persiste l’aliment sous l’identifiant renvoyé', async () => {
      const result = await useCase.execute(RIZ);

      expect(repository.foods.size).toBe(1);
      expect(repository.foods.get(result.id)?.name.toString()).toBe(
        'Riz basmati',
      );
    });

    it('attribue un identifiant distinct à chaque création', async () => {
      const first = await useCase.execute(RIZ);
      const second = await useCase.execute(RIZ);

      expect(first.id).not.toBe(second.id);
      expect(repository.foods.size).toBe(2);
    });

    it('accepte un aliment avec seulement un nom et une unité, les valeurs nutritionnelles étant à null', async () => {
      const result = await useCase.execute({
        name: 'Sel',
        unit: 'pincée',
        categories: ['autre'],
      });

      expect(result).toMatchObject({
        name: 'Sel',
        unit: 'pincée',
        categories: ['autre'],
        calories: null,
        proteins: null,
        carbohydrates: null,
        fats: null,
        sugars: null,
      });
    });

    it('accepte un aliment de catégorie autre sans quantité ni macros', async () => {
      const result = await useCase.execute({
        name: 'Curcuma',
        unit: 'cuillère à café',
        categories: ['autre'],
      });

      expect(result.categories).toEqual(['autre']);
      expect(repository.foods.size).toBe(1);
    });

    it('retire les espaces autour du nom et de l’unité', async () => {
      const result = await useCase.execute({
        ...RIZ,
        name: '  Riz basmati  ',
        unit: ' g ',
      });

      expect(result.name).toBe('Riz basmati');
      expect(result.unit).toBe('g');
    });

    it('accepte plusieurs catégories', async () => {
      const result = await useCase.execute({
        ...RIZ,
        categories: ['proteine', 'legume'],
      });

      expect(result.categories).toEqual(['proteine', 'legume']);
    });

    it('dédoublonne les catégories répétées', async () => {
      const result = await useCase.execute({
        ...RIZ,
        categories: ['legume', 'proteine', 'legume'],
      });

      expect(result.categories).toEqual(['legume', 'proteine']);
    });
  });

  describe('refus sans persistance', () => {
    it('refuse un nom vide avec INVALID_FOOD sans rien persister', async () => {
      await expect(
        useCase.execute({ ...RIZ, name: '   ' }),
      ).rejects.toBeInstanceOf(InvalidFoodError);
      await expect(
        useCase.execute({ ...RIZ, name: '   ' }),
      ).rejects.toMatchObject({
        code: 'INVALID_FOOD',
      });

      expect(repository.foods.size).toBe(0);
    });

    it('refuse un nom de plus de 200 caractères', async () => {
      await expect(
        useCase.execute({ ...RIZ, name: 'a'.repeat(201) }),
      ).rejects.toBeInstanceOf(InvalidFoodError);
    });

    it('refuse une unité vide avec INVALID_FOOD', async () => {
      await expect(useCase.execute({ ...RIZ, unit: '' })).rejects.toMatchObject(
        { code: 'INVALID_FOOD' },
      );
    });

    it('refuse une unité de plus de 20 caractères', async () => {
      await expect(
        useCase.execute({ ...RIZ, unit: 'a'.repeat(21) }),
      ).rejects.toBeInstanceOf(InvalidFoodError);
    });

    it('refuse une liste de catégories vide avec INVALID_FOOD', async () => {
      await expect(
        useCase.execute({ ...RIZ, categories: [] }),
      ).rejects.toMatchObject({ code: 'INVALID_FOOD' });

      expect(repository.foods.size).toBe(0);
    });

    it('refuse une catégorie inconnue avec INVALID_FOOD', async () => {
      await expect(
        useCase.execute({
          ...RIZ,
          categories: ['fruit' as unknown as FoodCategory],
        }),
      ).rejects.toMatchObject({ code: 'INVALID_FOOD' });

      expect(repository.foods.size).toBe(0);
    });

    it('refuse une valeur nutritionnelle négative avec INVALID_FOOD', async () => {
      await expect(
        useCase.execute({ ...RIZ, calories: -1 }),
      ).rejects.toBeInstanceOf(InvalidFoodError);

      expect(repository.foods.size).toBe(0);
    });

    it('refuse une valeur nutritionnelle non finie avec INVALID_FOOD', async () => {
      await expect(
        useCase.execute({ ...RIZ, proteins: Number.NaN }),
      ).rejects.toBeInstanceOf(InvalidFoodError);
    });
  });
});
