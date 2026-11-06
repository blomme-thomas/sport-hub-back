import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

const VALID_CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;

const storage = new AsyncLocalStorage<string>();

export function runWithCorrelationId<T>(id: string, fn: () => T): T {
  return storage.run(id, fn);
}

export function getCorrelationId(): string | undefined {
  return storage.getStore();
}

/**
 * Reprend l'identifiant entrant s'il est sûr (anti injection dans les logs et les headers), sinon en génère un.
 */
export function resolveCorrelationId(
  incoming: string | string[] | undefined,
): string {
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  if (value !== undefined && VALID_CORRELATION_ID.test(value)) {
    return value;
  }
  return randomUUID();
}
