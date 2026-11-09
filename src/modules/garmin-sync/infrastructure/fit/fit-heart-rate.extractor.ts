import { Injectable } from '@nestjs/common';
import { Decoder, Stream } from '@garmin/fitsdk';
import { unzipSync } from 'fflate';
import { GarminActivityFileInvalidError } from '../../domain/errors/garmin-activity-file-invalid.error.js';
import type {
  HeartRateSample,
  IActivityHeartRateExtractor,
} from '../../domain/ports/outbound/activity-heart-rate.extractor.port.js';

@Injectable()
export class FitHeartRateExtractor implements IActivityHeartRateExtractor {
  extract(file: Uint8Array): HeartRateSample[] {
    const fit = fitEntryOf(file);
    const decoder = new Decoder(Stream.fromByteArray([...fit]));
    if (!decoder.isFIT()) {
      throw new GarminActivityFileInvalidError();
    }
    const { messages, errors } = decoder.read({
      applyScaleAndOffset: true,
      expandComponents: true,
      mergeHeartRates: true,
    });
    if (errors.length > 0) {
      throw new GarminActivityFileInvalidError();
    }
    return (messages.recordMesgs ?? [])
      .filter(
        (record) =>
          typeof record.heartRate === 'number' &&
          record.timestamp instanceof Date,
      )
      .map((record) => ({
        occurredAt: record.timestamp as Date,
        bpm: record.heartRate as number,
      }));
  }
}

function fitEntryOf(file: Uint8Array): Uint8Array {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(file);
  } catch {
    throw new GarminActivityFileInvalidError();
  }
  const name = Object.keys(entries).find((entry) =>
    entry.toLowerCase().endsWith('.fit'),
  );
  if (name === undefined) {
    throw new GarminActivityFileInvalidError();
  }
  return entries[name] as Uint8Array;
}
