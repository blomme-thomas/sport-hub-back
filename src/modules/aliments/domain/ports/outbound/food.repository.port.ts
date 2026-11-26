import type { Food } from '../../entities/food.entity.js';
import type { FoodId } from '../../value-objects/food-id.vo.js';

export interface IFoodRepository {
  /** Renvoie l'aliment portant cet identifiant, ou null s'il n'existe pas. */
  findById(id: FoodId): Promise<Food | null>;

  /** Enregistre l'aliment : crée s'il est nouveau, met à jour sinon (même identifiant). */
  save(food: Food): Promise<void>;

  /** Vrai si au moins une recette contient cet aliment. */
  isUsedInRecipe(id: FoodId): Promise<boolean>;

  /** Supprime l'aliment ; sans effet s'il n'existe pas. */
  delete(id: FoodId): Promise<void>;

  /** Renvoie les aliments dont le nom est égal à l'un des noms fournis, sans tenir compte de la casse. */
  findByNames(names: readonly string[]): Promise<Food[]>;

  /** Enregistre tous les aliments dans une seule transaction : tout ou rien. */
  saveAll(foods: readonly Food[]): Promise<void>;
}

export const FOOD_REPOSITORY = Symbol('FOOD_REPOSITORY');
