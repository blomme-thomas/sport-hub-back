import { Inject, Injectable } from '@nestjs/common';
import { FoodNotFoundError } from '../../domain/errors/food-not-found.error.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import { FoodId } from '../../domain/value-objects/food-id.vo.js';
import { type GetFoodQuery, FoodDto } from '../dtos/food.dto.js';

@Injectable()
export class GetFoodUseCase {
  constructor(
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * Renvoie un aliment avec ses valeurs pour 100 g.
   *
   * @throws InvalidFoodError si l'identifiant n'est pas un UUID.
   * @throws FoodNotFoundError si l'aliment n'existe pas.
   */
  async execute(query: GetFoodQuery): Promise<FoodDto> {
    const food = await this.foods.findById(FoodId.from(query.id));
    if (food === null) {
      throw new FoodNotFoundError();
    }
    return FoodDto.fromDomain(food);
  }
}
