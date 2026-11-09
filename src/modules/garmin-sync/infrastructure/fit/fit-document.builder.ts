import type {
  ActivityFitDocument,
  HeartRateSample,
} from '../../domain/ports/outbound/activity-heart-rate.extractor.port.js';

export const FIT_DOCUMENT_FORMAT_VERSION = 1;

/** Valeurs qui signifient « non renseigné » dans le format FIT. */
const INVALID_VALUES = new Set([255, 65535, 4294967295, 2147483647]);

const SESSION_FIELDS = [
  'startTime',
  'sport',
  'subSport',
  'totalElapsedTime',
  'totalTimerTime',
  'totalDistance',
  'enhancedAvgSpeed',
  'totalCalories',
  'metabolicCalories',
  'avgHeartRate',
  'maxHeartRate',
  'trainingLoadPeak',
  'totalTrainingEffect',
  'totalAnaerobicTrainingEffect',
  'workoutFeel',
  'workoutRpe',
] as const;

const LAP_FIELDS = [
  'startTime',
  'totalElapsedTime',
  'totalTimerTime',
  'totalDistance',
  'enhancedAvgSpeed',
  'totalCalories',
  'metabolicCalories',
  'avgHeartRate',
  'maxHeartRate',
  'intensity',
  'lapTrigger',
  'sport',
  'subSport',
] as const;

const TIME_IN_ZONE_FIELDS = [
  'timestamp',
  'referenceMesg',
  'referenceIndex',
  'timeInHrZone',
  'hrZoneHighBoundary',
  'hrCalcType',
  'maxHeartRate',
  'restingHeartRate',
] as const;

type Message = Record<string, unknown>;

export interface DecodedFitMessages {
  sessionMesgs?: readonly object[];
  lapMesgs?: readonly object[];
  timeInZoneMesgs?: readonly object[];
  recordMesgs?: readonly object[];
}

/**
 * Construit le document d'une activité à partir des messages décodés du FIT : seuls les champs utiles sont gardés,
 * les valeurs « non renseigné » et les chaînes vides sont retirées, et les échantillons de FC sont compactés.
 */
export function buildActivityFitDocument(
  messages: DecodedFitMessages,
): ActivityFitDocument {
  const [session] = messages.sessionMesgs ?? [];
  return {
    formatVersion: FIT_DOCUMENT_FORMAT_VERSION,
    session:
      session === undefined ? null : pick(session as Message, SESSION_FIELDS),
    laps: (messages.lapMesgs ?? []).map((lap) =>
      pick(lap as Message, LAP_FIELDS),
    ),
    timeInZone: (messages.timeInZoneMesgs ?? []).map((zone) =>
      pick(zone as Message, TIME_IN_ZONE_FIELDS),
    ),
    records: (messages.recordMesgs ?? []).flatMap((record) => {
      const sample = heartRateSampleOf(record as Message);
      return sample === null
        ? []
        : [
            [Math.floor(sample.occurredAt.getTime() / 1000), sample.bpm] as [
              number,
              number,
            ],
          ];
    }),
  };
}

/** Reconstitue les échantillons de fréquence cardiaque à partir du document. */
export function heartRateSamplesOf(
  document: ActivityFitDocument,
): HeartRateSample[] {
  return document.records.map(([seconds, bpm]) => ({
    occurredAt: new Date(seconds * 1000),
    bpm,
  }));
}

function heartRateSampleOf(
  record: Message,
): { occurredAt: Date; bpm: number } | null {
  const bpm = record.heartRate;
  const timestamp = record.timestamp;
  if (!isUsable(bpm) || !(timestamp instanceof Date)) {
    return null;
  }
  return { occurredAt: timestamp, bpm: bpm as number };
}

function pick(
  message: Message,
  fields: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = message[field];
    if (value instanceof Date) {
      result[field] = value.toISOString();
    } else if (isUsable(value)) {
      result[field] = value;
    }
  }
  return result;
}

function isUsable(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'number') {
    return !INVALID_VALUES.has(value);
  }
  if (typeof value === 'string') {
    return value.replace(/\0+/g, '').trim().length > 0;
  }
  return true;
}
