import type { HttpFailure } from './http-client.types.js';

/**
 * Erreur technique levée quand un service externe échoue après les réessais autorisés.
 * Ne porte volontairement aucune `cause` ni URL : l'erreur d'origine peut contenir des secrets.
 */
export class ExternalServiceError extends Error {
  constructor(
    readonly target: string,
    readonly failure: HttpFailure,
    readonly attempts: number,
    readonly upstreamStatus?: number,
  ) {
    super(`Le service externe "${target}" est indisponible.`);
    this.name = 'ExternalServiceError';
  }
}
