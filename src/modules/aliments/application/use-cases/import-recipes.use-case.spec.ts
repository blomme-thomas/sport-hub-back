import { Food } from '../../domain/entities/food.entity.js';
import type { Recipe } from '../../domain/entities/recipe.entity.js';
import {
  RecipeImportDuplicateError,
  RecipeImportInvalidError,
} from '../../domain/errors/recipe-import.error.js';
import type { IFoodRepository } from '../../domain/ports/outbound/food.repository.port.js';
import type { IRecipeRepository } from '../../domain/ports/outbound/recipe.repository.port.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { ImportRecipesUseCase } from './import-recipes.use-case.js';

function food(name: string, categories: string[]): Food {
  return Food.create({
    name: FoodName.create(name),
    unit: FoodUnit.create('g'),
    categories,
    nutrition: NutritionValues.create({
      calories: null,
      proteins: null,
      carbohydrates: null,
      fats: null,
      sugars: null,
    }),
  });
}

class FakeFoodRepository implements IFoodRepository {
  readonly foods: Food[] = [];

  findById(): Promise<Food | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
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
      this.foods.filter((item) =>
        names.some(
          (name) =>
            name.trim().toLowerCase() === item.name.toString().toLowerCase(),
        ),
      ),
    );
  }

  saveAll(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeRecipeRepository implements IRecipeRepository {
  readonly recipes: Recipe[] = [];
  saveAllCalls = 0;

  findAll(): Promise<Recipe[]> {
    return Promise.resolve([...this.recipes]);
  }

  findById(): Promise<null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  findByNames(names: readonly string[]): Promise<Recipe[]> {
    return Promise.resolve(
      this.recipes.filter((recipe) =>
        names.some(
          (name) =>
            name.trim().toLowerCase() === recipe.name.toString().toLowerCase(),
        ),
      ),
    );
  }

  saveAll(recipes: readonly Recipe[]): Promise<void> {
    this.saveAllCalls += 1;
    this.recipes.push(...recipes);
    return Promise.resolve();
  }
}

function recette(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'Riz au poulet',
    mealTags: ['midi'],
    items: [
      { food: 'Poulet', component: 'proteine', quantity: 150 },
      { food: 'Riz basmati', component: 'feculent', quantity: 80 },
    ],
    ...overrides,
  };
}

function plan(recettes: unknown[] = [recette()]): Record<string, unknown> {
  return { kind: 'plan-recettes', schemaVersion: 1, recettes };
}

function captureError(action: () => Promise<unknown>): Promise<unknown> {
  return action().then(
    () => {
      throw new Error('aucune erreur levée');
    },
    (error: unknown) => error,
  );
}

describe('ImportRecipesUseCase', () => {
  let foods: FakeFoodRepository;
  let recipes: FakeRecipeRepository;
  let useCase: ImportRecipesUseCase;

  beforeEach(() => {
    foods = new FakeFoodRepository();
    foods.foods.push(
      food('Poulet', ['proteine']),
      food('Riz basmati', ['feculent']),
    );
    recipes = new FakeRecipeRepository();
    useCase = new ImportRecipesUseCase(recipes, foods);
  });

  it('crée la recette et rattache chaque item à l’aliment de même nom', async () => {
    const result = await useCase.execute(plan());

    expect(result.createdCount).toBe(1);
    expect(recipes.saveAllCalls).toBe(1);
    const [recipe] = recipes.recipes;
    expect(recipe?.name.toString()).toBe('Riz au poulet');
    expect(recipe?.items.map((item) => item.foodId.toString())).toEqual(
      foods.foods.map((item) => item.id.toString()),
    );
  });

  it('accepte aussi un tableau brut de recettes', async () => {
    const result = await useCase.execute([
      recette({ name: 'Salade', items: [] }),
    ]);

    expect(result.createdCount).toBe(1);
  });

  it('refuse un aliment introuvable, sans rien enregistrer', async () => {
    const error = await captureError(() =>
      useCase.execute(
        plan([
          recette({
            items: [{ food: 'Tofu', component: null, quantity: 100 }],
          }),
        ]),
      ),
    );

    expect(error).toBeInstanceOf(RecipeImportInvalidError);
    expect((error as RecipeImportInvalidError).errors).toEqual([
      expect.objectContaining({
        field: 'recettes[0].items[0].food',
        code: 'RECIPE_IMPORT_FOOD_UNKNOWN',
      }),
    ]);
    expect(recipes.saveAllCalls).toBe(0);
  });

  it('refuse un nom d’aliment qui désigne plusieurs aliments', async () => {
    foods.foods.push(food('poulet', ['proteine']));

    const error = await captureError(() => useCase.execute(plan()));

    expect(error).toBeInstanceOf(RecipeImportInvalidError);
    expect((error as RecipeImportInvalidError).errors[0]?.code).toBe(
      'RECIPE_IMPORT_FOOD_AMBIGUOUS',
    );
  });

  it('refuse un aliment placé dans un composant qui ne lui correspond pas', async () => {
    const error = await captureError(() =>
      useCase.execute(
        plan([
          recette({
            items: [{ food: 'Poulet', component: 'feculent', quantity: 100 }],
          }),
        ]),
      ),
    );

    expect(error).toBeInstanceOf(RecipeImportInvalidError);
    expect((error as RecipeImportInvalidError).errors[0]).toEqual(
      expect.objectContaining({
        field: 'recettes[0].items[0].component',
        code: 'RECIPE_IMPORT_COMPONENT_MISMATCH',
      }),
    );
  });

  it('refuse une recette sans tag de repas valide', async () => {
    const error = await captureError(() =>
      useCase.execute(plan([recette({ mealTags: ['gouter'] })])),
    );

    expect(error).toBeInstanceOf(RecipeImportInvalidError);
    expect((error as RecipeImportInvalidError).errors[0]?.code).toBe(
      'RECIPE_IMPORT_VALUE_INVALID',
    );
  });

  it('refuse une recette dont le nom existe déjà, sans tenir compte de la casse', async () => {
    await useCase.execute(
      plan([recette({ name: 'Salade niçoise', items: [] })]),
    );
    recipes.saveAllCalls = 0;

    const error = await captureError(() =>
      useCase.execute(plan([recette({ name: 'SALADE NIÇOISE', items: [] })])),
    );

    expect(error).toBeInstanceOf(RecipeImportDuplicateError);
    expect((error as RecipeImportDuplicateError).errors[0]?.code).toBe(
      'RECIPE_IMPORT_DUPLICATE',
    );
    expect(recipes.saveAllCalls).toBe(0);
  });
});
