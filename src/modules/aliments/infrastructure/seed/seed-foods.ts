import type { PrismaClient } from '../../../../core/prisma/generated/client.js';
import { Food } from '../../domain/entities/food.entity.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { FoodMapper } from '../persistence/prisma/food.mapper.js';
import { CIQUAL_SEED_FOODS, type SeedFood } from './ciqual-seed.data.js';

export interface SeedFoodsResult {
  created: number;
  updated: number;
}

/**
 * Insère ou met à jour les aliments de la sélection initiale, clé : nom. Réexécutable sans doublon.
 *
 * @throws InvalidFoodError si une entrée de la sélection est invalide.
 */
export async function seedFoods(
  prisma: PrismaClient,
  foods: readonly SeedFood[] = CIQUAL_SEED_FOODS,
): Promise<SeedFoodsResult> {
  const result: SeedFoodsResult = { created: 0, updated: 0 };
  for (const seed of foods) {
    const data = FoodMapper.toPersistence(
      Food.create({
        name: FoodName.create(seed.name),
        unit: FoodUnit.create(seed.unit),
        categories: seed.categories,
        nutrition: NutritionValues.create(seed.nutrition),
      }),
    );
    const existing = await prisma.food.findFirst({
      where: { name: seed.name },
      select: { id: true },
    });
    if (existing === null) {
      await prisma.food.create({ data });
      result.created += 1;
    } else {
      await prisma.food.update({
        where: { id: existing.id },
        data: { ...data, id: undefined },
      });
      result.updated += 1;
    }
  }
  return result;
}
