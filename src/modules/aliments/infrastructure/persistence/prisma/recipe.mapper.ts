import type {
  Prisma,
  Recipe as RecipeRecord,
  RecipeItem as RecipeItemRecord,
} from '../../../../../core/prisma/generated/client.js';
import { Recipe } from '../../../domain/entities/recipe.entity.js';
import { RecipeId } from '../../../domain/value-objects/recipe-id.vo.js';
import { RecipeName } from '../../../domain/value-objects/recipe-name.vo.js';
import { decimalToNumber } from './food.mapper.js';

export type RecipeWithItems = RecipeRecord & { items: RecipeItemRecord[] };

export class RecipeMapper {
  static toDomain(record: RecipeWithItems): Recipe {
    return Recipe.reconstitute({
      id: RecipeId.from(record.id),
      name: RecipeName.create(record.name),
      mealTags: record.mealTags,
      items: record.items.map((item) => ({
        foodId: item.foodId,
        component: item.component,
        quantity: decimalToNumber(item.quantity),
      })),
    });
  }

  static toRecipePersistence(recipe: Recipe): {
    name: string;
    mealTags: string[];
  } {
    return {
      name: recipe.name.toString(),
      mealTags: recipe.mealTags,
    };
  }

  static toItemsPersistence(
    recipe: Recipe,
  ): Prisma.RecipeItemUncheckedCreateWithoutRecipeInput[] {
    return recipe.items.map((item, position) => ({
      foodId: item.foodId.toString(),
      component: item.component,
      quantity: item.quantity,
      position,
    }));
  }
}
