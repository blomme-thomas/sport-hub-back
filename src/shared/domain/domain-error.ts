/**
 * Classe de base des Business Errors. Sans dépendance (ni NestJS, ni HTTP) :
 * la traduction en statut HTTP est faite en périphérie (src/core/filters).
 */
export abstract class DomainError extends Error {
  /** Code stable, UPPER_SNAKE_CASE, préfixé par le concept métier (ex. WORKOUT_NOT_FOUND). Contrat public. */
  abstract readonly code: string;

  protected constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}
