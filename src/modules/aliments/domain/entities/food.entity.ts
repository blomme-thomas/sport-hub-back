import { InvalidFoodError } from '../errors/invalid-food.error.js';
import {
  type FoodCategory,
  isFoodCategory,
} from '../value-objects/food-category.vo.js';
import { FoodId } from '../value-objects/food-id.vo.js';
import { FoodName } from '../value-objects/food-name.vo.js';
import { FoodUnit } from '../value-objects/food-unit.vo.js';
import { NutritionValues } from '../value-objects/nutrition-values.vo.js';

export interface FoodProps {
  name: FoodName;
  unit: FoodUnit;
  categories: readonly string[];
  nutrition: NutritionValues;
}

export interface FoodReconstitutionProps extends FoodProps {
  id: FoodId;
}

interface FoodState {
  id: FoodId;
  name: FoodName;
  unit: FoodUnit;
  categories: FoodCategory[];
  nutrition: NutritionValues;
}

export class Food {
  private constructor(private readonly state: FoodState) {}

  /**
   * Crée un aliment avec un identifiant neuf ; les catégories répétées sont retirées.
   *
   * @throws InvalidFoodError si aucune catégorie n'est fournie ou si une catégorie est inconnue.
   */
  static create(props: FoodProps): Food {
    return new Food({ id: FoodId.generate(), ...Food.validate(props) });
  }

  /**
   * Reconstitue un aliment persisté ; l'invariant des catégories est revérifié.
   *
   * @throws InvalidFoodError si aucune catégorie n'est fournie ou si une catégorie est inconnue.
   */
  static reconstitute({ id, ...props }: FoodReconstitutionProps): Food {
    return new Food({ id, ...Food.validate(props) });
  }

  get id(): FoodId {
    return this.state.id;
  }

  get name(): FoodName {
    return this.state.name;
  }

  get unit(): FoodUnit {
    return this.state.unit;
  }

  get categories(): FoodCategory[] {
    return [...this.state.categories];
  }

  get nutrition(): NutritionValues {
    return this.state.nutrition;
  }

  /**
   * Renvoie un nouvel aliment portant les champs fournis, sans modifier l'original ; des catégories fournies remplacent l'ensemble.
   *
   * @throws InvalidFoodError si les catégories fusionnées sont vides ou contiennent une catégorie inconnue.
   */
  change(changes: Partial<FoodProps>): Food {
    const current = this.state;
    return new Food({
      id: current.id,
      ...Food.validate({
        name: changes.name ?? current.name,
        unit: changes.unit ?? current.unit,
        categories: changes.categories ?? current.categories,
        nutrition: changes.nutrition ?? current.nutrition,
      }),
    });
  }

  private static validate(props: FoodProps): Omit<FoodState, 'id'> {
    const distinct = [...new Set(props.categories)];
    if (distinct.length === 0) {
      throw new InvalidFoodError('au moins une catégorie est requise');
    }
    const categories = distinct.filter(isFoodCategory);
    if (categories.length !== distinct.length) {
      throw new InvalidFoodError('une catégorie est inconnue');
    }
    return {
      name: props.name,
      unit: props.unit,
      categories,
      nutrition: props.nutrition,
    };
  }
}
