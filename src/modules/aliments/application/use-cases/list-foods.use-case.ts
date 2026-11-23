import { Inject, Injectable } from '@nestjs/common';
import { InvalidFoodError } from '../../domain/errors/invalid-food.error.js';
import {
  type FoodListItem,
  type IFoodListReadModel,
  FOOD_LIST_READ_MODEL,
} from '../../domain/ports/outbound/food-list.read-model.port.js';
import { isFoodCategory } from '../../domain/value-objects/food-category.vo.js';
import type { ListFoodsQuery } from '../dtos/food.dto.js';

@Injectable()
export class ListFoodsUseCase {
  constructor(
    @Inject(FOOD_LIST_READ_MODEL)
    private readonly foods: IFoodListReadModel,
  ) {}

  /**
   * Liste les aliments, filtrés par catégorie si elle est fournie et par nom (sans tenir compte de la casse) si la recherche est fournie.
   *
   * @throws InvalidFoodError si la catégorie demandée n'est pas une catégorie connue.
   */
  async execute(query: ListFoodsQuery): Promise<FoodListItem[]> {
    const category = query.category ?? null;
    if (category !== null && !isFoodCategory(category)) {
      throw new InvalidFoodError('la catégorie demandée est inconnue');
    }
    return this.foods.list({
      category,
      search: query.search?.trim() || null,
    });
  }
}
