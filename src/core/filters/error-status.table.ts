export const GENERIC_PROBLEM_CODES = {
  VALIDATION_FAILED: 400,
  BAD_REQUEST: 400,
  MALFORMED_REQUEST_BODY: 400,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  CLIENT_ERROR: 400,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Associe le code d'une Business Error à son statut HTTP.
 * Les clés sont des chaînes littérales car `src/core` n'importe jamais `src/modules` (deps:check).
 */
export const DOMAIN_ERROR_STATUS: Readonly<Record<string, number>> = {
  GARMIN_ACCESS_DENIED: 502,
  GARMIN_UNAVAILABLE: 503,
};

export const DEFAULT_DOMAIN_ERROR_STATUS = 422;

export const PROBLEM_CODES: readonly string[] = [
  ...Object.keys(GENERIC_PROBLEM_CODES),
  ...Object.keys(DOMAIN_ERROR_STATUS),
];
