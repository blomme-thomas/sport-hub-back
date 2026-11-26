import { Inject, Injectable } from '@nestjs/common';
import { FoodInUseError } from '../../domain/errors/food-in-use.error.js';
import { FoodNotFoundError } from '../../domain/errors/food-not-found.error.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import { FoodId } from '../../domain/value-objects/food-id.vo.js';

@Injectable()
export class DeleteFoodUseCase {
  constructor(
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * Supprime un aliment. Un aliment présent dans une recette ne peut pas être supprimé.
   *
   * @throws FoodNotFoundError si l'aliment n'existe pas.
   * @throws FoodInUseError si une recette le contient.
   */
  async execute(command: { id: string }): Promise<void> {
    const id = FoodId.from(command.id);
    if ((await this.foods.findById(id)) === null) {
      throw new FoodNotFoundError();
    }
    if (await this.foods.isUsedInRecipe(id)) {
      throw new FoodInUseError();
    }
    await this.foods.delete(id);
  }
}
