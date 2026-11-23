import type {
  CreateFoodCommand,
  FoodDto,
  ListFoodsQuery,
  UpdateFoodCommand,
} from '../../../application/dtos/food.dto.js';
import type { FoodListItem } from '../../../domain/ports/outbound/food-list.read-model.port.js';
import type { CreateFoodRequestDto } from '../dtos/create-food.request.dto.js';
import type { ListFoodsRequestDto } from '../dtos/list-foods.request.dto.js';
import type { UpdateFoodRequestDto } from '../dtos/update-food.request.dto.js';
import { FoodResponseDto } from '../dtos/food.response.dto.js';

export class FoodHttpMapper {
  static toCreateCommand(request: CreateFoodRequestDto): CreateFoodCommand {
    return {
      name: request.name,
      unit: request.unit,
      categories: request.categories,
      calories: request.calories,
      proteins: request.proteins,
      carbohydrates: request.carbohydrates,
      fats: request.fats,
      sugars: request.sugars,
    };
  }

  static toUpdateCommand(
    id: string,
    request: UpdateFoodRequestDto,
  ): UpdateFoodCommand {
    return {
      id,
      name: request.name,
      unit: request.unit,
      categories: request.categories,
      calories: request.calories,
      proteins: request.proteins,
      carbohydrates: request.carbohydrates,
      fats: request.fats,
      sugars: request.sugars,
    };
  }

  static toListQuery(request: ListFoodsRequestDto): ListFoodsQuery {
    return { category: request.category, search: request.search };
  }

  static toResponse(dto: FoodDto | FoodListItem): FoodResponseDto {
    return Object.assign(new FoodResponseDto(), {
      id: dto.id,
      name: dto.name,
      unit: dto.unit,
      categories: dto.categories,
      calories: dto.calories,
      proteins: dto.proteins,
      carbohydrates: dto.carbohydrates,
      fats: dto.fats,
      sugars: dto.sugars,
    });
  }
}
