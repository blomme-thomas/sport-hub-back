import type { IFoodRepository } from '../../domain/ports/outbound/food.repository.port.js';
import { InvalidRecipeError } from '../../domain/errors/invalid-recipe.error.js';
import { FoodId } from '../../domain/value-objects/food-id.vo.js';
import type { RecipeItemCommand } from '../dtos/recipe.dto.js';

/**
 * Vérifie que chaque aliment existe et que, s'il est placé dans un composant, il appartient à sa famille.
 *
 * @throws InvalidRecipeError si un aliment est introuvable ou hors de la famille de son composant.
 */
export async function checkRecipeComposition(
  foods: IFoodRepository,
  items: readonly RecipeItemCommand[],
): Promise<void> {
  for (const item of items) {
    const food = await foods.findById(FoodId.from(item.foodId));
    if (food === null) {
      throw new InvalidRecipeError('un aliment de la recette est introuvable');
    }
    if (
      item.component !== null &&
      !(food.categories as string[]).includes(item.component)
    ) {
      throw new InvalidRecipeError(
        `l'aliment ${food.name.toString()} n'appartient pas au composant ${item.component}`,
      );
    }
  }
}
