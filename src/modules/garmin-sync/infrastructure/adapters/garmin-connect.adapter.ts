import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  garminConfig,
  type GarminConfig,
} from '../../../../core/config/index.js';
import { ExternalServiceError } from '../../../../core/http/external-service.error.js';
import { HttpClientService } from '../../../../core/http/http-client.service.js';
import type { Activity } from '../../domain/entities/activity.entity.js';
import { GarminAccessDeniedError } from '../../domain/errors/garmin-access-denied.error.js';
import { GarminUnavailableError } from '../../domain/errors/garmin-unavailable.error.js';
import type { IGarminConnectClient } from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { GarminAuthenticationError } from './garmin-authentication.error.js';
import { GarminPersonalApiTokenProvider } from './garmin-personal-api-token.provider.js';
import { GarminConnectExternalMapper } from '../mappers/garmin-connect.external-mapper.js';

const TARGET = 'garmin-personal-api';
const ACTIVITIES_PATH = '/activitylist-service/activities/search/activities';
const SETTINGS_PATH = '/userprofile-service/userprofile/settings';
const settingsSchema = z.object({ displayName: z.string().nullish() });
const PAGE_SIZE = 99;
const MAX_PAGES = 50;
const DEFAULT_HISTORY_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GarminConnectAdapter implements IGarminConnectClient {
  private readonly logger = new Logger(GarminConnectAdapter.name);

  constructor(
    private readonly http: HttpClientService,
    private readonly tokens: GarminPersonalApiTokenProvider,
    @Inject(garminConfig.KEY) private readonly config: GarminConfig,
  ) {}

  async fetchActivitiesSince(since: Date | null): Promise<Activity[]> {
    const startDate = since
      ? this.formatDate(new Date(since.getTime() - DAY_MS))
      : this.formatDate(new Date(Date.now() - DEFAULT_HISTORY_DAYS * DAY_MS));
    const activities: Activity[] = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const items = await this.fetchPage(startDate, page * PAGE_SIZE);
      for (const item of items) {
        this.collect(item, activities);
      }
      if (items.length < PAGE_SIZE) {
        break;
      }
      if (page === MAX_PAGES - 1) {
        this.logger.warn(
          `Plafond de ${MAX_PAGES} pages atteint, des activités Garmin n'ont pas été récupérées`,
        );
      }
    }
    return activities;
  }

  private async fetchPage(
    startDate: string,
    offset: number,
  ): Promise<unknown[]> {
    const query = new URLSearchParams({
      startDate,
      start: String(offset),
      limit: String(PAGE_SIZE),
      excludeChildren: 'true',
    });
    const url = `${this.config.personalApiBaseUrl}${ACTIVITIES_PATH}?${query.toString()}`;
    const data = await this.getJson(url);
    if (!Array.isArray(data)) {
      throw new GarminUnavailableError();
    }
    return data as unknown[];
  }

  async fetchDisplayName(): Promise<string | null> {
    const url = `${this.config.personalApiBaseUrl}${SETTINGS_PATH}`;
    const parsed = settingsSchema.safeParse(await this.getJson(url));
    if (!parsed.success) {
      throw new GarminUnavailableError();
    }
    return parsed.data.displayName?.trim() || null;
  }

  private async getJson(url: string): Promise<unknown> {
    for (let attempt = 0; ; attempt += 1) {
      const token = await this.accessToken();
      try {
        const response = await this.http.get<unknown>(TARGET, url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      } catch (error) {
        if (!(error instanceof ExternalServiceError)) {
          throw error;
        }
        const rejected =
          error.failure === 'HTTP_STATUS' &&
          (error.upstreamStatus === 401 || error.upstreamStatus === 403);
        if (!rejected) {
          throw new GarminUnavailableError();
        }
        if (attempt >= 1) {
          throw new GarminAccessDeniedError();
        }
        this.tokens.invalidate();
      }
    }
  }

  private async accessToken(): Promise<string> {
    try {
      return await this.tokens.getAccessToken();
    } catch (error) {
      if (error instanceof GarminAuthenticationError) {
        throw error.failure === 'UNEXPECTED_RESPONSE'
          ? new GarminUnavailableError()
          : new GarminAccessDeniedError();
      }
      if (error instanceof ExternalServiceError) {
        throw new GarminUnavailableError();
      }
      throw error;
    }
  }

  private collect(item: unknown, activities: Activity[]): void {
    const translation = GarminConnectExternalMapper.toDomain(item);
    switch (translation.status) {
      case 'ok':
        activities.push(translation.activity);
        return;
      case 'format':
        this.logger.warn(
          `Activité Garmin ignorée (format inattendu, id ${translation.id})`,
        );
        return;
      case 'invalid':
        this.logger.warn(
          `Activité Garmin ignorée (valeurs invalides, id ${translation.id})`,
        );
        return;
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
