import {
  FoodImportDuplicateError,
  FoodImportInvalidError,
} from '../../domain/errors/food-import.error.js';
import type { IFoodRepository } from '../../domain/ports/outbound/food.repository.port.js';
import { Food } from '../../domain/entities/food.entity.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { ImportFoodsUseCase } from './import-foods.use-case.js';

class FakeFoodRepository implements IFoodRepository {
  readonly foods = new Map<string, Food>();
  saveAllCalls = 0;

  findById(): Promise<Food | null> {
    return Promise.resolve(null);
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

  findByNames(names: readonly string[]): Promise<Food[]> {
    return Promise.resolve(
      [...this.foods.values()].filter((food) =>
        names.some(
          (name) =>
            name.trim().toLowerCase() === food.name.toString().toLowerCase(),
        ),
      ),
    );
  }

  saveAll(foods: readonly Food[]): Promise<void> {
    this.saveAllCalls += 1;
    for (const food of foods) {
      this.foods.set(food.id.toString(), food);
    }
    return Promise.resolve();
  }
}

function aliment(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'Riz basmati',
    unit: 'g',
    categories: ['feculent'],
    calories: 350,
    proteins: 7,
    carbohydrates: 78,
    fats: 0.6,
    sugars: 0.1,
    ...overrides,
  };
}

function plan(aliments: unknown[] = [aliment()]): Record<string, unknown> {
  return { kind: 'plan-aliments', schemaVersion: 1, aliments };
}

function captureError(action: () => Promise<unknown>): Promise<unknown> {
  return action().then(
    () => {
      throw new Error('aucune erreur levée');
    },
    (error: unknown) => error,
  );
}

describe('ImportFoodsUseCase', () => {
  let repository: FakeFoodRepository;
  let useCase: ImportFoodsUseCase;

  beforeEach(() => {
    repository = new FakeFoodRepository();
    useCase = new ImportFoodsUseCase(repository);
  });

  it('crée tous les aliments de l’enveloppe et renvoie leurs identifiants', async () => {
    const result = await useCase.execute(
      plan([
        aliment(),
        aliment({ name: 'Poulet', unit: 'g', categories: ['proteine'] }),
      ]),
    );

    expect(result.createdCount).toBe(2);
    expect(result.ids).toHaveLength(2);
    expect(repository.saveAllCalls).toBe(1);
    expect(
      [...repository.foods.values()].map((food) => food.name.toString()),
    ).toEqual(['Riz basmati', 'Poulet']);
  });

  it('accepte aussi un tableau brut d’aliments', async () => {
    const result = await useCase.execute([aliment({ name: 'Lentilles' })]);

    expect(result.createdCount).toBe(1);
    expect(repository.foods.size).toBe(1);
  });

  it('refuse le fichier en entier si un aliment est invalide, sans rien enregistrer', async () => {
    const error = await captureError(() =>
      useCase.execute(
        plan([aliment(), aliment({ name: 'Pain', categories: ['fruit'] })]),
      ),
    );

    expect(error).toBeInstanceOf(FoodImportInvalidError);
    expect((error as FoodImportInvalidError).errors).toEqual([
      expect.objectContaining({
        field: 'aliments[1]',
        code: 'FOOD_IMPORT_VALUE_INVALID',
      }),
    ]);
    expect(repository.saveAllCalls).toBe(0);
    expect(repository.foods.size).toBe(0);
  });

  it('signale chaque champ inconnu, type invalide ou valeur hors bornes', async () => {
    const error = await captureError(() =>
      useCase.execute(plan([aliment({ inconnu: 1, unit: 42, calories: -3 })])),
    );

    expect(error).toBeInstanceOf(FoodImportInvalidError);
    const fields = (error as FoodImportInvalidError).errors.map(
      (issue) => issue.field,
    );
    expect(fields).toEqual(
      expect.arrayContaining([
        'aliments[0].inconnu',
        'aliments[0].unit',
        'aliments[0].calories',
      ]),
    );
  });

  it('refuse un fichier de mauvaise nature ou de mauvaise version', async () => {
    const error = await captureError(() =>
      useCase.execute({
        kind: 'plan-seances',
        schemaVersion: 9,
        aliments: [aliment()],
      }),
    );

    expect(error).toBeInstanceOf(FoodImportInvalidError);
    expect(
      (error as FoodImportInvalidError).errors.map((issue) => issue.field),
    ).toEqual(['kind', 'schemaVersion']);
  });

  it('refuse une liste vide', async () => {
    const error = await captureError(() => useCase.execute(plan([])));

    expect(error).toBeInstanceOf(FoodImportInvalidError);
    expect((error as FoodImportInvalidError).errors[0]?.code).toBe(
      'FOOD_IMPORT_LIST_EMPTY',
    );
  });

  it('refuse un aliment dont le nom existe déjà, sans tenir compte de la casse ni des espaces', async () => {
    repository.foods.set(
      'existant',
      Food.create({
        name: FoodName.create('riz BASMATI'),
        unit: FoodUnit.create('g'),
        categories: ['feculent'],
        nutrition: NutritionValues.create({
          calories: null,
          proteins: null,
          carbohydrates: null,
          fats: null,
          sugars: null,
        }),
      }),
    );

    const error = await captureError(() =>
      useCase.execute(
        plan([
          aliment({ name: '  Riz Basmati ' }),
          aliment({ name: 'Quinoa' }),
        ]),
      ),
    );

    expect(error).toBeInstanceOf(FoodImportDuplicateError);
    expect((error as FoodImportDuplicateError).errors).toEqual([
      expect.objectContaining({
        field: 'aliments[0].name',
        code: 'FOOD_IMPORT_DUPLICATE',
      }),
    ]);
    expect(repository.saveAllCalls).toBe(0);
  });
});
