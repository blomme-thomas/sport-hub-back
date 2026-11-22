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
import type {
  DailyCaloriesDay,
  HeartRateZonesConfig,
  IGarminConnectClient,
  RecoveryDay,
  RecoveryRange,
} from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { GarminDailyCaloriesExternalMapper } from '../mappers/garmin-daily-calories.external-mapper.js';
import {
  GarminRecoveryExternalMapper,
  enumerateDays,
} from '../mappers/garmin-recovery.external-mapper.js';
import { GarminAuthenticationError } from './garmin-authentication.error.js';
import { GarminPersonalApiTokenProvider } from './garmin-personal-api-token.provider.js';
import { GarminConnectExternalMapper } from '../mappers/garmin-connect.external-mapper.js';

const TARGET = 'garmin-personal-api';
const ACTIVITIES_PATH = '/activitylist-service/activities/search/activities';
const SETTINGS_PATH = '/userprofile-service/userprofile/settings';
const HEART_RATE_ZONES_PATH = '/biometric-service/heartRateZones/v2';
const SLEEP_SUMMARIES_PATH = '/sleep-service/sleep/dailySleepSummariesByDate';
const HRV_RANGE_PATH = '/hrv-service/hrv/daily';
const BODY_BATTERY_REPORT_PATH =
  '/wellness-service/wellness/bodyBattery/reports/daily';
const DAILY_HEART_RATE_PATH = '/wellness-service/wellness/dailyHeartRate';
const DAILY_SUMMARIES_PATH = '/usersummary-service/v2/dailysummaries';
const ACTIVITY_FILE_PATH = '/download-service/files/activity';
const settingsSchema = z.object({ displayName: z.string().nullish() });
const heartRateZonesSchema = z.array(
  z.object({
    sport: z.string().nullish(),
    trainingMethod: z.string().nullish(),
    maxHeartRateUsed: z.number().int().nullish(),
    restingHeartRateUsed: z.number().int().nullish(),
    zone1Floor: z.number().int().nullish(),
    zone2Floor: z.number().int().nullish(),
    zone3Floor: z.number().int().nullish(),
    zone4Floor: z.number().int().nullish(),
    zone5Floor: z.number().int().nullish(),
  }),
);
const PAGE_SIZE = 99;
const MAX_PAGES = 50;
const DEFAULT_HISTORY_DAYS = 365;
const DAILY_SUMMARIES_CHUNK_DAYS = 90;
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

  async fetchHeartRateZones(): Promise<HeartRateZonesConfig | null> {
    const query = new URLSearchParams({ generateDefaults: 'false' });
    const url = `${this.config.personalApiBaseUrl}${HEART_RATE_ZONES_PATH}?${query.toString()}`;
    const parsed = heartRateZonesSchema.safeParse(await this.getJson(url));
    if (!parsed.success) {
      throw new GarminUnavailableError();
    }
    const config = parsed.data.find((entry) => entry.sport === 'DEFAULT');
    if (!config) {
      return null;
    }
    return {
      trainingMethod: config.trainingMethod ?? null,
      maxHeartRateUsed: config.maxHeartRateUsed ?? null,
      restingHeartRateUsed: config.restingHeartRateUsed ?? null,
      zoneFloors: [
        config.zone1Floor ?? null,
        config.zone2Floor ?? null,
        config.zone3Floor ?? null,
        config.zone4Floor ?? null,
        config.zone5Floor ?? null,
      ],
    };
  }

  async fetchRecoveryDays(range: RecoveryRange): Promise<RecoveryDay[]> {
    const { from, to } = range;
    const days = enumerateDays(from, to);
    const sleep = await this.getJson(
      `${this.config.personalApiBaseUrl}${SLEEP_SUMMARIES_PATH}?${new URLSearchParams({ startDate: from, endDate: to }).toString()}`,
    );
    const hrv = await this.getJson(
      `${this.config.personalApiBaseUrl}${HRV_RANGE_PATH}/${from}/${to}`,
    );
    const bodyBattery = await this.getJson(
      `${this.config.personalApiBaseUrl}${BODY_BATTERY_REPORT_PATH}?${new URLSearchParams({ startDate: from, endDate: to }).toString()}`,
    );
    const restingHeartRateByDate = new Map<string, unknown>();
    for (const day of days) {
      const query = new URLSearchParams({ date: day });
      restingHeartRateByDate.set(
        day,
        await this.getJson(
          `${this.config.personalApiBaseUrl}${DAILY_HEART_RATE_PATH}?${query.toString()}`,
        ),
      );
    }
    return GarminRecoveryExternalMapper.combine(range, {
      sleep,
      hrv,
      bodyBattery,
      restingHeartRateByDate,
    });
  }

  async fetchActivityFile(garminActivityId: string): Promise<Uint8Array> {
    const data = await this.getResource<ArrayBuffer | Uint8Array>(
      `${this.config.personalApiBaseUrl}${ACTIVITY_FILE_PATH}/${encodeURIComponent(garminActivityId)}`,
      'arraybuffer',
    );
    return new Uint8Array(data);
  }

  async fetchDailyCalories(range: RecoveryRange): Promise<DailyCaloriesDay[]> {
    const days: DailyCaloriesDay[] = [];
    for (const chunk of this.dailySummaryChunks(range)) {
      const query = new URLSearchParams({
        startDate: chunk.from,
        endDate: chunk.to,
      });
      const payload = await this.getJson(
        `${this.config.personalApiBaseUrl}${DAILY_SUMMARIES_PATH}?${query.toString()}`,
      );
      days.push(...GarminDailyCaloriesExternalMapper.combine(chunk, payload));
    }
    return days;
  }

  private dailySummaryChunks(range: RecoveryRange): RecoveryRange[] {
    const chunks: RecoveryRange[] = [];
    const last = Date.parse(`${range.to}T00:00:00.000Z`);
    const step = DAILY_SUMMARIES_CHUNK_DAYS * DAY_MS;
    for (
      let start = Date.parse(`${range.from}T00:00:00.000Z`);
      start <= last;
      start += step
    ) {
      const end = Math.min(start + step - DAY_MS, last);
      chunks.push({
        from: this.formatDate(new Date(start)),
        to: this.formatDate(new Date(end)),
      });
    }
    return chunks;
  }

  private async getJson(url: string): Promise<unknown> {
    return this.getResource<unknown>(url, 'json');
  }

  private async getResource<T>(
    url: string,
    responseType: 'json' | 'arraybuffer',
  ): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      const token = await this.accessToken();
      try {
        const response = await this.http.get<T>(TARGET, url, {
          headers: { Authorization: `Bearer ${token}` },
          responseType,
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
