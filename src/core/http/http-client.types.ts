export type HttpFailure = 'TIMEOUT' | 'NETWORK' | 'HTTP_STATUS';

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
}

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Corps binaire : 'arraybuffer' renvoie un Buffer ; 'json' (défaut) renvoie le JSON décodé. */
  responseType?: 'json' | 'arraybuffer';
}

export interface HttpRequest extends HttpRequestOptions {
  method: string;
  url: string;
  data?: unknown;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

export const DEFAULT_HTTP_CLIENT_OPTIONS: HttpClientOptions = {
  timeoutMs: 10_000,
  maxRetries: 2,
  backoffBaseMs: 200,
  backoffMaxMs: 2_000,
};

export const HTTP_CLIENT_DEFAULTS = Symbol('HTTP_CLIENT_DEFAULTS');
