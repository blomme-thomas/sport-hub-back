import { InvalidRecipeError } from '../errors/invalid-recipe.error.js';

const MAX_LENGTH = 200;

export class RecipeName {
  private constructor(private readonly value: string) {}

  static create(raw: string): RecipeName {
    const value = raw.trim();
    if (value.length === 0 || value.length > MAX_LENGTH) {
      throw new InvalidRecipeError(
        `le nom doit faire entre 1 et ${MAX_LENGTH} caractères`,
      );
    }
    return new RecipeName(value);
  }

  toString(): string {
    return this.value;
  }
}
