export type GarminAuthenticationFailure =
  'KEY_MISSING' | 'KEY_REJECTED' | 'UNEXPECTED_RESPONSE';

const MESSAGES: Record<GarminAuthenticationFailure, string> = {
  KEY_MISSING: "La clé de l'API Garmin Personal n'est pas configurée.",
  KEY_REJECTED: "La clé de l'API Garmin Personal a été refusée par Garmin.",
  UNEXPECTED_RESPONSE:
    "La réponse d'authentification de l'API Garmin Personal est inattendue.",
};

/**
 * Erreur technique levée quand l'authentification auprès de l'API Garmin Personal échoue.
 * Ne porte volontairement ni la clé, ni le jeton, ni `cause`.
 */
export class GarminAuthenticationError extends Error {
  constructor(readonly failure: GarminAuthenticationFailure) {
    super(MESSAGES[failure]);
    this.name = 'GarminAuthenticationError';
  }
}
