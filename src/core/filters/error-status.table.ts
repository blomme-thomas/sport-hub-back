/** Codes génériques (hors Business Errors) et leur statut HTTP. */
export const GENERIC_PROBLEM_CODES = {
  VALIDATION_FAILED: 400,
  BAD_REQUEST: 400,
  MALFORMED_REQUEST_BODY: 400,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  CLIENT_ERROR: 400 /* autre 4xx */,
  INTERNAL_ERROR: 500,
} as const;

/**
 * Business Error code -> statut HTTP. Clés en chaînes littérales : src/core
 * n'importe jamais src/modules (deps:check). Vide tant qu'aucun module.
 */
export const DOMAIN_ERROR_STATUS: Readonly<Record<string, number>> = {};

/** Statut d'une Business Error absente de la table. */
export const DEFAULT_DOMAIN_ERROR_STATUS = 422;

/** Tous les codes connus (génériques + métier), pour l'enum OpenAPI. */
export const PROBLEM_CODES: readonly string[] = [
  ...Object.keys(GENERIC_PROBLEM_CODES),
  ...Object.keys(DOMAIN_ERROR_STATUS),
];
