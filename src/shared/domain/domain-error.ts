/**
 * Sert de classe de base aux Business Errors, sans dépendance à NestJS ni à HTTP :
 * la traduction en statut HTTP est faite en périphérie (`src/core/filters`).
 */
export abstract class DomainError extends Error {
  /** Code stable en UPPER_SNAKE_CASE, préfixé par le concept métier (ex. `WORKOUT_NOT_FOUND`). */
  abstract readonly code: string;

  protected constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}
