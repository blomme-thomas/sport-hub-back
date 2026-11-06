const SAFE_CODE = /^[A-Za-z0-9_]{1,40}$/;
const MAX_CAUSE_DEPTH = 3;

/**
 * Code d'erreur (ex. ECONNREFUSED) lu sur l'erreur puis sur ses causes (profondeur 3).
 * Seul un code court alphanumérique est renvoyé : jamais de texte libre, qui pourrait
 * contenir une URL de connexion ou un secret.
 */
export function safeErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof current !== 'object' || current === null) return undefined;
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string' && SAFE_CODE.test(code)) return code;
    current = cause;
  }
  return undefined;
}

/** Erreur technique (pas une Business Error) : la base est injoignable. Sans secret ni cause. */
export class DatabaseUnavailableError extends Error {
  constructor(
    target: { host: string; port: number; name: string },
    reason?: string,
  ) {
    super(
      `Base de données injoignable (${target.host}:${target.port}/${target.name})${reason ? ` : ${reason}` : ''}.`,
    );
    this.name = 'DatabaseUnavailableError';
  }
}
