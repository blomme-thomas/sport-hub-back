import type { Recipe } from '../../entities/recipe.entity.js';
import type { RecipeId } from '../../value-objects/recipe-id.vo.js';

export interface IRecipeRepository {
  /** Renvoie toutes les recettes, triées par nom. */
  findAll(): Promise<Recipe[]>;

  /** Renvoie la recette portant cet identifiant, ou null s'il n'existe pas. */
  findById(id: RecipeId): Promise<Recipe | null>;

  /** Enregistre la recette et remplace sa composition : crée si nouvelle, met à jour sinon. */
  save(recipe: Recipe): Promise<void>;

  /** Supprime la recette et ses items. */
  delete(id: RecipeId): Promise<void>;
}

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');
