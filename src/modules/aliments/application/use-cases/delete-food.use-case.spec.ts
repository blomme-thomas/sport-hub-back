import { Food } from '../../domain/entities/food.entity.js';
import { FoodInUseError } from '../../domain/errors/food-in-use.error.js';
import { FoodNotFoundError } from '../../domain/errors/food-not-found.error.js';
import type { IFoodRepository } from '../../domain/ports/outbound/food.repository.port.js';
import type { FoodId } from '../../domain/value-objects/food-id.vo.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { DeleteFoodUseCase } from './delete-food.use-case.js';

const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

class FakeFoodRepository implements IFoodRepository {
  readonly foods = new Map<string, Food>();
  readonly usedIds = new Set<string>();

  findById(id: FoodId): Promise<Food | null> {
    return Promise.resolve(this.foods.get(id.toString()) ?? null);
  }

  save(food: Food): Promise<void> {
    this.foods.set(food.id.toString(), food);
    return Promise.resolve();
  }

  isUsedInRecipe(id: FoodId): Promise<boolean> {
    return Promise.resolve(this.usedIds.has(id.toString()));
  }

  delete(id: FoodId): Promise<void> {
    this.foods.delete(id.toString());
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

describe('DeleteFoodUseCase', () => {
  let repository: FakeFoodRepository;
  let useCase: DeleteFoodUseCase;
  let food: Food;

  beforeEach(async () => {
    repository = new FakeFoodRepository();
    useCase = new DeleteFoodUseCase(repository);
    food = seededFood();
    await repository.save(food);
  });

  it('supprime un aliment que aucune recette n’utilise', async () => {
    await useCase.execute({ id: food.id.toString() });

    expect(repository.foods.has(food.id.toString())).toBe(false);
  });

  it('refuse un aliment utilisé dans une recette et le garde', async () => {
    repository.usedIds.add(food.id.toString());

    await expect(
      useCase.execute({ id: food.id.toString() }),
    ).rejects.toBeInstanceOf(FoodInUseError);
    expect(repository.foods.has(food.id.toString())).toBe(true);
  });

  it('signale un aliment introuvable', async () => {
    await expect(useCase.execute({ id: UNKNOWN_ID })).rejects.toBeInstanceOf(
      FoodNotFoundError,
    );
  });
});
