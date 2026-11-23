import type { FoodCategory } from '../../value-objects/food-category.vo.js';

export interface FoodListCriteria {
  category: FoodCategory | null;
  search: string | null;
}

export interface FoodListItem {
  id: string;
  name: string;
  unit: string;
  categories: string[];
  calories: number | null;
  proteins: number | null;
  carbohydrates: number | null;
  fats: number | null;
  sugars: number | null;
}

export interface IFoodListReadModel {
  /** Renvoie les aliments répondant aux critères, triés par nom ; le nom est comparé sans tenir compte de la casse. */
  list(criteria: FoodListCriteria): Promise<FoodListItem[]>;
}

export const FOOD_LIST_READ_MODEL = Symbol('FOOD_LIST_READ_MODEL');
