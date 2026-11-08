import { z } from 'zod';
import type { RecoveryDay } from '../../domain/ports/outbound/garmin-connect-client.port.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const optionalNumber = z.number().nullable().catch(null);

const sleepItemSchema = z.object({
  calendarDate: z.string(),
  sleepTimeSeconds: optionalNumber,
});

const hrvSummarySchema = z.object({
  calendarDate: z.string(),
  lastNightAvg: optionalNumber,
  weeklyAvg: optionalNumber,
});

const bodyBatteryItemSchema = z.object({
  date: z.string(),
  charged: optionalNumber,
  drained: optionalNumber,
});

const restingHeartRateSchema = z.object({
  calendarDate: z.string(),
  restingHeartRate: optionalNumber,
});

const hrvEnvelopeSchema = z.object({
  hrvSummaries: z.array(z.unknown()),
});

interface HrvValues {
  readonly lastNightAvg: number | null;
  readonly weeklyAvg: number | null;
}

interface BodyBatteryValues {
  readonly charged: number | null;
  readonly drained: number | null;
}

export interface GarminRecoveryPayloads {
  readonly sleep: unknown;
  readonly hrv: unknown;
  readonly bodyBattery: unknown;
  /** Réponse de la fréquence cardiaque de repos, pour chaque date demandée. */
  readonly restingHeartRateByDate: ReadonlyMap<string, unknown>;
}

/** Un corps vide (204 Garmin) signifie qu'il n'y a aucune donnée, pas une erreur. */
function isEmptyBody(payload: unknown): boolean {
  return payload === undefined || payload === null || payload === '';
}

function listOf(payload: unknown): unknown[] {
  return isEmptyBody(payload) ? [] : (payload as unknown[]);
}

export function enumerateDays(from: string, to: string): string[] {
  const days: string[] = [];
  const end = Date.parse(`${to}T00:00:00.000Z`);
  for (
    let time = Date.parse(`${from}T00:00:00.000Z`);
    time <= end;
    time += DAY_MS
  ) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
}

export class GarminRecoveryExternalMapper {
  /**
   * Regroupe les réponses Garmin par jour. Un jour absent d'une réponse, ou une réponse vide (204),
   * donne null pour les indicateurs correspondants. Les réponses mal formées d'un élément sont ignorées pour cet élément.
   */
  static combine(
    range: { from: string; to: string },
    payloads: GarminRecoveryPayloads,
  ): RecoveryDay[] {
    const sleep = GarminRecoveryExternalMapper.sleepByDate(payloads.sleep);
    const hrv = GarminRecoveryExternalMapper.hrvByDate(payloads.hrv);
    const bodyBattery = GarminRecoveryExternalMapper.bodyBatteryByDate(
      payloads.bodyBattery,
    );
    return enumerateDays(range.from, range.to).map((date) => ({
      date,
      sleepSeconds: sleep.get(date) ?? null,
      hrvLastNightAvg: hrv.get(date)?.lastNightAvg ?? null,
      hrvWeeklyAvg: hrv.get(date)?.weeklyAvg ?? null,
      bodyBatteryCharged: bodyBattery.get(date)?.charged ?? null,
      bodyBatteryDrained: bodyBattery.get(date)?.drained ?? null,
      restingHeartRate: GarminRecoveryExternalMapper.restingHeartRate(
        payloads.restingHeartRateByDate.get(date),
      ),
    }));
  }

  static sleepByDate(payload: unknown): Map<string, number> {
    const byDate = new Map<string, number>();
    for (const item of listOf(payload)) {
      const parsed = sleepItemSchema.safeParse(item);
      if (parsed.success && parsed.data.sleepTimeSeconds !== null) {
        byDate.set(parsed.data.calendarDate, parsed.data.sleepTimeSeconds);
      }
    }
    return byDate;
  }

  static hrvByDate(payload: unknown): Map<string, HrvValues> {
    const byDate = new Map<string, HrvValues>();
    if (isEmptyBody(payload)) {
      return byDate;
    }
    const envelope = hrvEnvelopeSchema.safeParse(payload);
    if (!envelope.success) {
      return byDate;
    }
    for (const item of envelope.data.hrvSummaries) {
      const parsed = hrvSummarySchema.safeParse(item);
      if (parsed.success) {
        byDate.set(parsed.data.calendarDate, {
          lastNightAvg: parsed.data.lastNightAvg,
          weeklyAvg: parsed.data.weeklyAvg,
        });
      }
    }
    return byDate;
  }

  static bodyBatteryByDate(payload: unknown): Map<string, BodyBatteryValues> {
    const byDate = new Map<string, BodyBatteryValues>();
    for (const item of listOf(payload)) {
      const parsed = bodyBatteryItemSchema.safeParse(item);
      if (parsed.success) {
        byDate.set(parsed.data.date, {
          charged: parsed.data.charged,
          drained: parsed.data.drained,
        });
      }
    }
    return byDate;
  }

  static restingHeartRate(payload: unknown): number | null {
    if (isEmptyBody(payload)) {
      return null;
    }
    const parsed = restingHeartRateSchema.safeParse(payload);
    return parsed.success ? parsed.data.restingHeartRate : null;
  }
}
