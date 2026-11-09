import { describe, expect, it } from 'vitest';
import { buildActivityFitDocument } from './fit-document.builder.js';

const START = new Date('2026-11-08T08:44:19.000Z');

describe('buildActivityFitDocument', () => {
  it('ne garde que les champs utiles de la session, des tours et des zones', () => {
    const document = buildActivityFitDocument({
      sessionMesgs: [
        {
          startTime: START,
          sport: 'cycling',
          totalElapsedTime: 888.144,
          avgHeartRate: 165,
          maxHeartRate: 185,
          serialNumber: 42,
          manufacturer: 'garmin',
        },
      ],
      lapMesgs: [
        {
          startTime: START,
          totalCalories: 214,
          intensity: 'active',
          timeCreated: START,
        },
      ],
      timeInZoneMesgs: [
        { timeInHrZone: [0, 9.7, 123], hrZoneHighBoundary: [102, 122, 143] },
      ],
      recordMesgs: [],
    });

    expect(document.session).toEqual({
      startTime: START.toISOString(),
      sport: 'cycling',
      totalElapsedTime: 888.144,
      avgHeartRate: 165,
      maxHeartRate: 185,
    });
    expect(document.laps).toEqual([
      {
        startTime: START.toISOString(),
        totalCalories: 214,
        intensity: 'active',
      },
    ]);
    expect(document.timeInZone).toEqual([
      { timeInHrZone: [0, 9.7, 123], hrZoneHighBoundary: [102, 122, 143] },
    ]);
  });

  it('retire les valeurs invalides et les chaînes vides', () => {
    const document = buildActivityFitDocument({
      sessionMesgs: [
        {
          avgHeartRate: 255,
          maxHeartRate: 65535,
          totalCalories: 4294967295,
          totalTrainingEffect: 2147483647,
          sport: '',
          workoutRpe: null,
          totalDistance: 0,
        },
      ],
      lapMesgs: [],
      timeInZoneMesgs: [],
      recordMesgs: [],
    });

    expect(document.session).toEqual({ totalDistance: 0 });
  });

  it('renvoie une session absente à null', () => {
    const document = buildActivityFitDocument({
      sessionMesgs: [],
      lapMesgs: [],
      timeInZoneMesgs: [],
      recordMesgs: [],
    });

    expect(document.session).toBeNull();
    expect(document.laps).toEqual([]);
  });

  it('ignore une FC à zéro, qui signifie l’absence de capteur', () => {
    const document = buildActivityFitDocument({
      sessionMesgs: [],
      lapMesgs: [],
      timeInZoneMesgs: [],
      recordMesgs: [
        { timestamp: START, heartRate: 0 },
        { timestamp: new Date(START.getTime() + 1000), heartRate: 120 },
      ],
    });

    expect(document.records).toEqual([[Math.floor(START.getTime() / 1000) + 1, 120]]);
  });

  it('représente chaque échantillon avec FC par un couple [secondes Unix, bpm] et ignore ceux sans FC', () => {
    const document = buildActivityFitDocument({
      sessionMesgs: [],
      lapMesgs: [],
      timeInZoneMesgs: [],
      recordMesgs: [
        { timestamp: START, heartRate: 110, distance: 0 },
        { timestamp: new Date(START.getTime() + 1000), distance: 0 },
        { timestamp: new Date(START.getTime() + 2000), heartRate: 118 },
      ],
    });

    expect(document.records).toEqual([
      [Math.floor(START.getTime() / 1000), 110],
      [Math.floor(START.getTime() / 1000) + 2, 118],
    ]);
    expect(document.formatVersion).toBe(1);
  });
});
