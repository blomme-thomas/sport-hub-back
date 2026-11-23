import { InvalidPlannedMealError } from '../errors/invalid-planned-meal.error.js';
import { MealDate } from '../value-objects/meal-date.vo.js';
import { type MealTag, isMealTag } from '../value-objects/meal-tag.vo.js';
import { PlannedMealId } from '../value-objects/planned-meal-id.vo.js';
import { RecipeId } from '../value-objects/recipe-id.vo.js';

export interface PlannedMealProps {
  recipeId: string;
  date: string;
  mealTag: string;
}

export interface PlannedMealReconstitutionProps {
  id: PlannedMealId;
  recipeId: RecipeId;
  date: MealDate;
  mealTag: MealTag;
}

interface PlannedMealState {
  id: PlannedMealId;
  recipeId: RecipeId;
  date: MealDate;
  mealTag: MealTag;
}

/**
 * Utilisation d'une recette à une date et pour un repas. Une même recette peut être placée plusieurs fois, chaque placement a son identifiant.
 */
export class PlannedMeal {
  private constructor(private readonly state: PlannedMealState) {}

  /** @throws InvalidPlannedMealError si la date, le repas ou la recette sont invalides. */
  static create(props: PlannedMealProps): PlannedMeal {
    return new PlannedMeal({
      id: PlannedMealId.generate(),
      ...PlannedMeal.validate(props),
    });
  }

  /** @throws InvalidPlannedMealError si les données persistées sont invalides. */
  static reconstitute({
    id,
    ...props
  }: PlannedMealReconstitutionProps): PlannedMeal {
    return new PlannedMeal({ id, ...props });
  }

  get id(): PlannedMealId {
    return this.state.id;
  }

  get recipeId(): RecipeId {
    return this.state.recipeId;
  }

  get date(): MealDate {
    return this.state.date;
  }

  get mealTag(): MealTag {
    return this.state.mealTag;
  }

  /** Renvoie un nouveau repas planifié (même identifiant), déplacé selon les champs fournis. */
  move(changes: { date?: string; mealTag?: string }): PlannedMeal {
    return new PlannedMeal({
      id: this.state.id,
      ...PlannedMeal.validate({
        recipeId: this.state.recipeId.toString(),
        date: changes.date ?? this.state.date.toString(),
        mealTag: changes.mealTag ?? this.state.mealTag,
      }),
    });
  }

  private static validate(
    props: PlannedMealProps,
  ): Omit<PlannedMealState, 'id'> {
    if (!isMealTag(props.mealTag)) {
      throw new InvalidPlannedMealError(
        'le repas doit être matin, midi ou soir',
      );
    }
    return {
      recipeId: RecipeId.from(props.recipeId),
      date: MealDate.create(props.date),
      mealTag: props.mealTag,
    };
  }
}
