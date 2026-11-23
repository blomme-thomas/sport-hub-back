import { randomUUID } from 'node:crypto';
import { InvalidRecipeError } from '../errors/invalid-recipe.error.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class RecipeId {
  private constructor(private readonly value: string) {}

  static generate(): RecipeId {
    return new RecipeId(randomUUID());
  }

  static from(value: string): RecipeId {
    if (!UUID_PATTERN.test(value)) {
      throw new InvalidRecipeError(
        "l'identifiant de la recette n'est pas un UUID",
      );
    }
    return new RecipeId(value);
  }

  equals(other: RecipeId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
