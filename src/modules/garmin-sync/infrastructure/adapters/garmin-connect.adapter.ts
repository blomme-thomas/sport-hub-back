import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  garminConfig,
  type GarminConfig,
} from '../../../../core/config/index.js';
import { ExternalServiceError } from '../../../../core/http/external-service.error.js';
import { HttpClientService } from '../../../../core/http/http-client.service.js';
import { Activity } from '../../domain/entities/activity.entity.js';
import { GarminAccessDeniedError } from '../../domain/errors/garmin-access-denied.error.js';
import { GarminUnavailableError } from '../../domain/errors/garmin-unavailable.error.js';
import { InvalidActivityError } from '../../domain/errors/invalid-activity.error.js';
import type { IGarminConnectClient } from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { GarminActivityId } from '../../domain/value-objects/garmin-activity-id.vo.js';
import { GarminAuthenticationError } from './garmin-authentication.error.js';
import { GarminPersonalApiTokenProvider } from './garmin-personal-api-token.provider.js';

const TARGET = 'garmin-personal-api';
const ACTIVITIES_PATH = '/activitylist-service/activities/search/activities';
const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const DEFAULT_HISTORY_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const GMT_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/;

const garminActivitySchema = z.object({
  activityId: z.union([z.number().int().nonnegative(), z.string().min(1)]),
  activityType: z.object({ typeKey: z.string().min(1) }),
  startTimeGMT: z.string().regex(GMT_TIMESTAMP),
  duration: z.number().min(0),
  distance: z.number().min(0).nullish(),
});

@Injectable()
export class GarminConnectAdapter implements IGarminConnectClient {
  private readonly logger = new Logger(GarminConnectAdapter.name);

  constructor(
    private readonly http: HttpClientService,
    private readonly tokens: GarminPersonalApiTokenProvider,
    @Inject(garminConfig.KEY) private readonly config: GarminConfig,
  ) {}

  async fetchActivitiesSince(since: Date | null): Promise<Activity[]> {
    const startDate = this.formatDate(
      since ?? new Date(Date.now() - DEFAULT_HISTORY_DAYS * DAY_MS),
    );
    const activities: Activity[] = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const items = await this.fetchPage(startDate, page * PAGE_SIZE);
      for (const item of items) {
        const activity = this.translate(item);
        if (activity) {
          activities.push(activity);
        }
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
    });
    const url = `${this.config.personalApiBaseUrl}${ACTIVITIES_PATH}?${query.toString()}`;

    for (let attempt = 0; ; attempt += 1) {
      const token = await this.accessToken();
      try {
        const response = await this.http.get<unknown>(TARGET, url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!Array.isArray(response.data)) {
          throw new GarminUnavailableError();
        }
        return response.data as unknown[];
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

  private translate(item: unknown): Activity | null {
    const parsed = garminActivitySchema.safeParse(item);
    if (!parsed.success) {
      this.logger.warn(
        `Activité Garmin ignorée (format inattendu, id ${this.identify(item)})`,
      );
      return null;
    }
    const data = parsed.data;
    try {
      return Activity.create({
        garminActivityId: GarminActivityId.create(String(data.activityId)),
        type: data.activityType.typeKey,
        startedAt: new Date(`${data.startTimeGMT.replace(' ', 'T')}Z`),
        durationSeconds: data.duration,
        distanceMeters: data.distance ?? null,
        sourcePayload: item,
      });
    } catch (error) {
      if (error instanceof InvalidActivityError) {
        this.logger.warn(
          `Activité Garmin ignorée (valeurs invalides, id ${String(data.activityId)})`,
        );
        return null;
      }
      throw error;
    }
  }

  private identify(item: unknown): string {
    if (typeof item === 'object' && item !== null && 'activityId' in item) {
      const id = (item as { activityId: unknown }).activityId;
      if (typeof id === 'number' || typeof id === 'string') {
        return String(id);
      }
    }
    return 'inconnu';
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
