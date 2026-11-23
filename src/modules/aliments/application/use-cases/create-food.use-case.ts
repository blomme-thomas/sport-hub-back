import { Inject, Injectable } from '@nestjs/common';
import { Food } from '../../domain/entities/food.entity.js';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { type CreateFoodCommand, FoodDto } from '../dtos/food.dto.js';

@Injectable()
export class CreateFoodUseCase {
  constructor(
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * Crée et enregistre un aliment ; les valeurs nutritionnelles absentes restent vides.
   *
   * @throws InvalidFoodError si le nom, l'unité ou une valeur est invalide, ou si aucune catégorie valide n'est fournie.
   */
  async execute(command: CreateFoodCommand): Promise<FoodDto> {
    const food = Food.create({
      name: FoodName.create(command.name),
      unit: FoodUnit.create(command.unit),
      categories: command.categories,
      nutrition: NutritionValues.create({
        calories: command.calories ?? null,
        proteins: command.proteins ?? null,
        carbohydrates: command.carbohydrates ?? null,
        fats: command.fats ?? null,
        sugars: command.sugars ?? null,
      }),
    });
    await this.foods.save(food);
    return FoodDto.fromDomain(food);
  }
}
