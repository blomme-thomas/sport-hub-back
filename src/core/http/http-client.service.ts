import { setTimeout as sleep } from 'node:timers/promises';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { getCorrelationId } from '../middlewares/correlation-id.storage.js';
import { ExternalServiceError } from './external-service.error.js';
import {
  HTTP_CLIENT_DEFAULTS,
  type HttpClientOptions,
  type HttpFailure,
  type HttpRequest,
  type HttpRequestOptions,
  type HttpResponse,
} from './http-client.types.js';
import { backoffDelayMs, isRetryable } from './retry-policy.js';

const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

interface Attempt<T> {
  response?: HttpResponse<T>;
  failure?: HttpFailure;
  status?: number;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(HTTP_CLIENT_DEFAULTS) private readonly defaults: HttpClientOptions,
  ) {}

  /**
   * Exécute la requête avec timeout et réessais bornés, et traduit toute défaillance en `ExternalServiceError`.
   *
   * @throws ExternalServiceError si la cible échoue (timeout, réseau ou statut hors 2xx) après les réessais autorisés.
   */
  async request<T = unknown>(
    target: string,
    request: HttpRequest,
  ): Promise<HttpResponse<T>> {
    const method = request.method.toUpperCase();
    const maxAttempts = this.defaults.maxRetries + 1;

    for (let attempt = 1; ; attempt += 1) {
      const outcome = await this.attempt<T>(target, method, request);
      if (outcome.response) {
        return outcome.response;
      }
      const failure = outcome.failure as HttpFailure;
      if (
        attempt >= maxAttempts ||
        !isRetryable(method, failure, outcome.status)
      ) {
        throw new ExternalServiceError(
          target,
          failure,
          attempt,
          outcome.status,
        );
      }
      await sleep(backoffDelayMs(attempt, this.defaults));
    }
  }

  get<T = unknown>(
    target: string,
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(target, { ...options, method: 'GET', url });
  }

  post<T = unknown>(
    target: string,
    url: string,
    data?: unknown,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(target, { ...options, method: 'POST', url, data });
  }

  private async attempt<T>(
    target: string,
    method: string,
    request: HttpRequest,
  ): Promise<Attempt<T>> {
    const label = this.label(target, method, request.url);
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url: request.url,
          data: request.data,
          headers: request.headers,
          timeout: request.timeoutMs ?? this.defaults.timeoutMs,
          maxRedirects: 0,
          validateStatus: () => true,
        }),
      );
      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`${label} -> ${response.status}`);
        return { response: { status: response.status, data: response.data } };
      }
      this.logger.warn(`${label} -> ${response.status}`);
      return { failure: 'HTTP_STATUS', status: response.status };
    } catch (error) {
      const failure = this.classify(error);
      this.logger.warn(`${label} -> ${failure}`);
      return { failure };
    }
  }

  private classify(error: unknown): HttpFailure {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === 'string' && TIMEOUT_CODES.has(code)
      ? 'TIMEOUT'
      : 'NETWORK';
  }

  private label(target: string, method: string, url: string): string {
    let location = 'invalid-url';
    try {
      const parsed = new URL(url);
      location = `${parsed.origin}${parsed.pathname}`;
    } catch {
      location = 'invalid-url';
    }
    return `[${getCorrelationId() ?? '-'}] ${target} ${method} ${location}`;
  }
}
