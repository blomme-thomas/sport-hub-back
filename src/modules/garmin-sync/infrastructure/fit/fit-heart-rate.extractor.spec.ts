import { Encoder, Profile } from '@garmin/fitsdk';
import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { GarminActivityFileInvalidError } from '../../domain/errors/garmin-activity-file-invalid.error.js';
import { FitHeartRateExtractor } from './fit-heart-rate.extractor.js';

const START = new Date('2026-11-08T08:44:19.000Z');

function fitBytes(
  records: { seconds: number; heartRate?: number }[],
): Uint8Array {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: Profile.MesgNum.FILE_ID,
    type: 'activity',
    manufacturer: 'development',
    product: 1,
    serialNumber: 1,
    timeCreated: START,
  });
  for (const record of records) {
    encoder.writeMesg({
      mesgNum: Profile.MesgNum.RECORD,
      timestamp: new Date(START.getTime() + record.seconds * 1000),
      ...(record.heartRate === undefined
        ? {}
        : { heartRate: record.heartRate }),
    });
  }
  return encoder.close();
}

function zipWith(name: string, content: Uint8Array): Uint8Array {
  return zipSync({ [name]: content });
}

describe('FitHeartRateExtractor', () => {
  const extractor = new FitHeartRateExtractor();
  const samplesOf = (zip: Uint8Array) =>
    extractor.extract(zip).heartRateSamples;

  it('extrait la fréquence cardiaque horodatée de chaque échantillon du FIT', () => {
    const zip = zipWith(
      'activite_ACTIVITY.fit',
      fitBytes([
        { seconds: 0, heartRate: 110 },
        { seconds: 1, heartRate: 112 },
        { seconds: 2, heartRate: 115 },
      ]),
    );

    expect(samplesOf(zip)).toEqual([
      { occurredAt: START, bpm: 110 },
      { occurredAt: new Date(START.getTime() + 1000), bpm: 112 },
      { occurredAt: new Date(START.getTime() + 2000), bpm: 115 },
    ]);
  });

  it('ignore les échantillons sans fréquence cardiaque', () => {
    const zip = zipWith(
      'activite_ACTIVITY.fit',
      fitBytes([
        { seconds: 0, heartRate: 110 },
        { seconds: 1 },
        { seconds: 2, heartRate: 118 },
      ]),
    );

    expect(samplesOf(zip).map((sample) => sample.bpm)).toEqual([110, 118]);
  });

  it('renvoie une liste vide quand le FIT ne contient aucune fréquence cardiaque', () => {
    const zip = zipWith('activite_ACTIVITY.fit', fitBytes([{ seconds: 0 }]));

    expect(samplesOf(zip)).toEqual([]);
  });

  it('lève GarminActivityFileInvalidError quand l’archive ne contient pas de FIT', () => {
    const zip = zipWith('notes.txt', new TextEncoder().encode('pas un fit'));

    expect(() => extractor.extract(zip)).toThrow(
      GarminActivityFileInvalidError,
    );
  });

  it('lève GarminActivityFileInvalidError quand l’archive n’est pas un zip', () => {
    expect(() => extractor.extract(new TextEncoder().encode('brut'))).toThrow(
      GarminActivityFileInvalidError,
    );
  });
});
