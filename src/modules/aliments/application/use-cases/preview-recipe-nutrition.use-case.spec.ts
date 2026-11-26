import { Food } from '../../domain/entities/food.entity.js';
import { InvalidRecipeError } from '../../domain/errors/invalid-recipe.error.js';
import type { IFoodRepository } from '../../domain/ports/outbound/food.repository.port.js';
import type { FoodId } from '../../domain/value-objects/food-id.vo.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { PreviewRecipeNutritionUseCase } from './preview-recipe-nutrition.use-case.js';

const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

class FakeFoodRepository implements IFoodRepository {
  readonly foods = new Map<string, Food>();

  findByNames(names: readonly string[]): Promise<Food[]> {
    return Promise.resolve(
      [...this.foods.values()].filter((food) =>
        names.includes(food.name.toString()),
      ),
    );
  }

  saveAll(): Promise<void> {
    return Promise.resolve();
  }

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

describe('PreviewRecipeNutritionUseCase', () => {
  let repository: FakeFoodRepository;
  let useCase: PreviewRecipeNutritionUseCase;
  let rice: Food;

  beforeEach(async () => {
    repository = new FakeFoodRepository();
    useCase = new PreviewRecipeNutritionUseCase(repository);
    rice = Food.create({
      name: FoodName.create('Riz'),
      unit: FoodUnit.create('g'),
      categories: ['feculent'],
      nutrition: NutritionValues.create({
        calories: 100,
        proteins: 2,
        carbohydrates: 22,
        fats: 0.5,
        sugars: 0,
      }),
    });
    await repository.save(rice);
  });

  it('calcule la synthèse d’une composition sans rien enregistrer', async () => {
    const summary = await useCase.execute({
      items: [
        { foodId: rice.id.toString(), component: 'feculent', quantity: 150 },
      ],
    });

    expect(summary.totals.calories).toBe(150);
    expect(summary.byComponent.feculent.calories).toBe(150);
    expect(summary.ignored).toEqual([]);
  });

  it('signale un item sans quantité sans l’ajouter aux totaux', async () => {
    const summary = await useCase.execute({
      items: [
        { foodId: rice.id.toString(), component: 'feculent', quantity: null },
      ],
    });

    expect(summary.totals.calories).toBe(0);
    expect(summary.ignored).toEqual([
      { foodId: rice.id.toString(), reason: 'quantity-missing' },
    ]);
  });

  it('refuse un aliment inconnu', async () => {
    await expect(
      useCase.execute({
        items: [{ foodId: UNKNOWN_ID, component: 'feculent', quantity: 100 }],
      }),
    ).rejects.toBeInstanceOf(InvalidRecipeError);
  });
});
