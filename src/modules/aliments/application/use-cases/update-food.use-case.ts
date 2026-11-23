import { Inject, Injectable } from '@nestjs/common';
import {
  type IFoodRepository,
  FOOD_REPOSITORY,
} from '../../domain/ports/outbound/food.repository.port.js';
import { FoodNotFoundError } from '../../domain/errors/food-not-found.error.js';
import { FoodId } from '../../domain/value-objects/food-id.vo.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { type UpdateFoodCommand, FoodDto } from '../dtos/food.dto.js';

@Injectable()
export class UpdateFoodUseCase {
  constructor(
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * Modifie un aliment existant : les champs absents gardent leur valeur, une valeur nutritionnelle `null` est effacée, des catégories fournies remplacent l'ensemble.
   *
   * @throws FoodNotFoundError si l'aliment n'existe pas.
   * @throws InvalidFoodError si une valeur est invalide ou si les catégories fusionnées sont vides ou inconnues.
   */
  async execute(command: UpdateFoodCommand): Promise<FoodDto> {
    const food = await this.foods.findById(FoodId.from(command.id));
    if (food === null) {
      throw new FoodNotFoundError();
    }
    const current = food.nutrition;
    const updated = food.change({
      name:
        command.name === undefined ? undefined : FoodName.create(command.name),
      unit:
        command.unit === undefined ? undefined : FoodUnit.create(command.unit),
      categories: command.categories,
      nutrition: NutritionValues.create({
        calories:
          command.calories === undefined ? current.calories : command.calories,
        proteins:
          command.proteins === undefined ? current.proteins : command.proteins,
        carbohydrates:
          command.carbohydrates === undefined
            ? current.carbohydrates
            : command.carbohydrates,
        fats: command.fats === undefined ? current.fats : command.fats,
        sugars: command.sugars === undefined ? current.sugars : command.sugars,
      }),
    });
    await this.foods.save(updated);
    return FoodDto.fromDomain(updated);
  }
}
