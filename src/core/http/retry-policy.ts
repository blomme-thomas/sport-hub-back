import type { HttpClientOptions, HttpFailure } from './http-client.types.js';

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

/**
 * Indique si la méthode HTTP peut être rejouée sans effet de bord supplémentaire.
 */
export function isIdempotent(method: string): boolean {
  return IDEMPOTENT_METHODS.has(method.toUpperCase());
}

/**
 * Décide si une défaillance mérite un réessai : jamais pour une méthode non idempotente ni pour un statut hors 5xx.
 */
export function isRetryable(
  method: string,
  failure: HttpFailure,
  status?: number,
): boolean {
  if (!isIdempotent(method)) {
    return false;
  }
  if (failure === 'HTTP_STATUS') {
    return status !== undefined && status >= 500;
  }
  return true;
}

/**
 * Calcule le délai exponentiel (sans jitter) avant le réessai numéro `retry`, plafonné à `backoffMaxMs`.
 */
export function backoffDelayMs(
  retry: number,
  options: Pick<HttpClientOptions, 'backoffBaseMs' | 'backoffMaxMs'>,
): number {
  return Math.min(
    options.backoffBaseMs * 2 ** Math.max(0, retry - 1),
    options.backoffMaxMs,
  );
}
