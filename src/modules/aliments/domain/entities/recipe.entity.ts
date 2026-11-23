import { InvalidRecipeError } from '../errors/invalid-recipe.error.js';
import { FoodId } from '../value-objects/food-id.vo.js';
import { type MealTag, isMealTag } from '../value-objects/meal-tag.vo.js';
import {
  type RecipeComponent,
  isRecipeComponent,
} from '../value-objects/recipe-component.vo.js';
import { RecipeId } from '../value-objects/recipe-id.vo.js';
import { RecipeName } from '../value-objects/recipe-name.vo.js';

export interface RecipeItemInput {
  foodId: string;
  component: string | null;
  quantity: number | null;
}

export interface RecipeItem {
  readonly foodId: FoodId;
  readonly component: RecipeComponent | null;
  readonly quantity: number | null;
}

export interface RecipeProps {
  name: RecipeName;
  mealTags: readonly string[];
  items: readonly RecipeItemInput[];
}

export interface RecipeReconstitutionProps extends RecipeProps {
  id: RecipeId;
}

interface RecipeState {
  id: RecipeId;
  name: RecipeName;
  mealTags: MealTag[];
  items: RecipeItem[];
}

export class Recipe {
  private constructor(private readonly state: RecipeState) {}

  /**
   * Crée une recette avec un identifiant neuf ; aucun composant n'est obligatoire.
   *
   * @throws InvalidRecipeError si aucun tag de repas valide n'est fourni ou si un item est invalide.
   */
  static create(props: RecipeProps): Recipe {
    return new Recipe({ id: RecipeId.generate(), ...Recipe.validate(props) });
  }

  /**
   * Reconstitue une recette persistée ; les invariants sont revérifiés.
   *
   * @throws InvalidRecipeError si les données persistées sont invalides.
   */
  static reconstitute({ id, ...props }: RecipeReconstitutionProps): Recipe {
    return new Recipe({ id, ...Recipe.validate(props) });
  }

  get id(): RecipeId {
    return this.state.id;
  }

  get name(): RecipeName {
    return this.state.name;
  }

  get mealTags(): MealTag[] {
    return [...this.state.mealTags];
  }

  get items(): RecipeItem[] {
    return [...this.state.items];
  }

  /**
   * Renvoie une nouvelle recette ; une composition fournie remplace l'ensemble des items.
   *
   * @throws InvalidRecipeError si les valeurs fusionnées sont invalides.
   */
  change(changes: Partial<RecipeProps>): Recipe {
    const current = this.state;
    return new Recipe({
      id: current.id,
      ...Recipe.validate({
        name: changes.name ?? current.name,
        mealTags: changes.mealTags ?? current.mealTags,
        items: changes.items ?? current.items.map(toInput),
      }),
    });
  }

  private static validate(props: RecipeProps): Omit<RecipeState, 'id'> {
    const mealTags = [...new Set(props.mealTags)];
    if (mealTags.length === 0) {
      throw new InvalidRecipeError('au moins un tag de repas est requis');
    }
    if (!mealTags.every(isMealTag)) {
      throw new InvalidRecipeError('un tag de repas est inconnu');
    }
    return {
      name: props.name,
      mealTags,
      items: props.items.map((input) => Recipe.toItem(input)),
    };
  }

  private static toItem(input: RecipeItemInput): RecipeItem {
    if (input.component !== null && !isRecipeComponent(input.component)) {
      throw new InvalidRecipeError('un composant est inconnu');
    }
    if (input.quantity !== null && !(input.quantity > 0)) {
      throw new InvalidRecipeError(
        'une quantité doit être strictement positive',
      );
    }
    return {
      foodId: FoodId.from(input.foodId),
      component: input.component,
      quantity: input.quantity,
    };
  }
}

function toInput(item: RecipeItem): RecipeItemInput {
  return {
    foodId: item.foodId.toString(),
    component: item.component,
    quantity: item.quantity,
  };
}
