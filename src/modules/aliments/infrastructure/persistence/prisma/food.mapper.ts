import type {
  Food as FoodRecord,
  Prisma,
} from '../../../../../core/prisma/generated/client.js';
import { Food } from '../../../domain/entities/food.entity.js';
import { FoodId } from '../../../domain/value-objects/food-id.vo.js';
import { FoodName } from '../../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../../domain/value-objects/nutrition-values.vo.js';

export function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

export class FoodMapper {
  static toDomain(record: FoodRecord): Food {
    return Food.reconstitute({
      id: FoodId.from(record.id),
      name: FoodName.create(record.name),
      unit: FoodUnit.create(record.unit),
      categories: record.categories,
      nutrition: NutritionValues.create({
        calories: decimalToNumber(record.calories),
        proteins: decimalToNumber(record.proteins),
        carbohydrates: decimalToNumber(record.carbohydrates),
        fats: decimalToNumber(record.fats),
        sugars: decimalToNumber(record.sugars),
      }),
    });
  }

  static toPersistence(food: Food): Prisma.FoodUncheckedCreateInput {
    return {
      id: food.id.toString(),
      name: food.name.toString(),
      unit: food.unit.toString(),
      categories: food.categories,
      calories: food.nutrition.calories,
      proteins: food.nutrition.proteins,
      carbohydrates: food.nutrition.carbohydrates,
      fats: food.nutrition.fats,
      sugars: food.nutrition.sugars,
    };
  }
}
