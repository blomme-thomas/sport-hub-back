import type { Food } from '../../entities/food.entity.js';
import type { FoodId } from '../../value-objects/food-id.vo.js';

export interface IFoodRepository {
  /** Renvoie l'aliment portant cet identifiant, ou null s'il n'existe pas. */
  findById(id: FoodId): Promise<Food | null>;

  /** Enregistre l'aliment : crée s'il est nouveau, met à jour sinon (même identifiant). */
  save(food: Food): Promise<void>;
}

export const FOOD_REPOSITORY = Symbol('FOOD_REPOSITORY');
