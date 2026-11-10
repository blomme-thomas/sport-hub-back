import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  garminConfig,
  type GarminConfig,
} from '../../../../core/config/index.js';
import { ExternalServiceError } from '../../../../core/http/external-service.error.js';
import { HttpClientService } from '../../../../core/http/http-client.service.js';
import { GarminAuthenticationError } from './garmin-authentication.error.js';

const TARGET = 'garmin-personal-api';
const TOKEN_PATH =
  '/personalapitoken-service/personal-api/personal-api-key/token';
const EXPIRY_MARGIN_MS = 60_000;

const tokenSchema = z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]*$/);
const claimsSchema = z.object({ exp: z.number().positive() });

interface CachedToken {
  value: string;
  expiresAt: number;
}

function expiryOf(token: string): number | undefined {
  try {
    const payload = Buffer.from(token.split('.')[1], 'base64url').toString(
      'utf8',
    );
    const claims = claimsSchema.safeParse(JSON.parse(payload));
    return claims.success ? claims.data.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

@Injectable()
export class GarminPersonalApiTokenProvider {
  private cached?: CachedToken;
  private pending?: Promise<string>;

  constructor(
    private readonly http: HttpClientService,
    @Inject(garminConfig.KEY) private readonly config: GarminConfig,
  ) {}

  /**
   * Renvoie un jeton d'accès valide, en le réutilisant tant qu'il n'expire pas dans moins de 60 secondes.
   * Les appels simultanés partagent une seule obtention auprès de Garmin.
   *
   * @throws GarminAuthenticationError si la clé est absente, refusée ou si la réponse est inattendue.
   * @throws ExternalServiceError si le service Garmin est indisponible.
   */
  getAccessToken(): Promise<string> {
    if (this.cached && this.cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
      return Promise.resolve(this.cached.value);
    }
    if (!this.pending) {
      this.pending = this.fetchToken().finally(() => {
        this.pending = undefined;
      });
    }
    return this.pending;
  }

  /** Oublie le jeton en mémoire pour forcer une nouvelle obtention au prochain appel. */
  invalidate(): void {
    this.cached = undefined;
  }

  private async fetchToken(): Promise<string> {
    const key = this.config.personalApiKey;
    if (!key) {
      throw new GarminAuthenticationError('KEY_MISSING');
    }

    let data: unknown;
    try {
      const response = await this.http.post<unknown>(
        TARGET,
        `${this.config.personalApiBaseUrl}${TOKEN_PATH}`,
        undefined,
        { headers: { Authorization: `ApiKey ${key}` } },
      );
      data = response.data;
    } catch (error) {
      if (
        error instanceof ExternalServiceError &&
        error.failure === 'HTTP_STATUS' &&
        (error.upstreamStatus === 401 || error.upstreamStatus === 403)
      ) {
        throw new GarminAuthenticationError('KEY_REJECTED');
      }
      throw error;
    }

    const parsed = tokenSchema.safeParse(data);
    const expiresAt = parsed.success ? expiryOf(parsed.data) : undefined;
    if (!parsed.success || expiresAt === undefined) {
      throw new GarminAuthenticationError('UNEXPECTED_RESPONSE');
    }

    this.cached = { value: parsed.data, expiresAt };
    return parsed.data;
  }
}
