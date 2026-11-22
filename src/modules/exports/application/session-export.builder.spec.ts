import { describe, expect, it } from 'vitest';
import type {
  WeekActivityDetail,
  WeekSessionOccurrence,
} from '../domain/ports/outbound/week-export.ports.js';
import {
  buildSessionExport,
  SESSION_EXPORT_NOTES,
} from './session-export.builder.js';

const OCCURRENCE: WeekSessionOccurrence = {
  sessionId: 'a2b5c6d7-0000-4000-8000-000000000001',
  date: '2026-11-10',
  startTime: '18:00',
  disciplineTypeKey: 'running',
  status: 'planifiee',
  durationMinutes: 60,
  targetDistanceMeters: 10000,
  targetHrZonePercentages: [0, 50, 50, 0, 0],
  modules: [
    {
      position: 1,
      type: 'series',
      durationMinutes: 40,
      instruction: '4 x 1 km',
      targetZones: null,
      perceivedEffort: 7,
    },
  ],
  linkedActivityId: 'activite-1',
  achievement: {
    distanceRate: 0.95,
    durationRate: 1.02,
    zoneGapsPoints: [0, 5, -3, 0, 0],
  },
};

const DETAIL: WeekActivityDetail = {
  id: 'activite-1',
  type: 'running',
  startedAt: new Date('2026-11-10T17:05:00.000Z'),
  durationSeconds: 3500,
  distanceMeters: 9500,
  averageHeartRate: 152,
  hrTimeInZone: [0, 900, 1500, 800, 300],
  perceivedEffort: 6,
  feeling: 2,
};

describe('buildSessionExport', () => {
  it('reprend le format, le plan et le réalisé d’une séance rapprochée du même jour', () => {
    const dto = buildSessionExport(OCCURRENCE, DETAIL);

    expect(dto).toMatchObject({
      format: 'bilan-seance',
      kind: 'seance',
      schemaVersion: 1,
      notesPourLAnalyse: SESSION_EXPORT_NOTES,
    });
    expect(dto.seance).toMatchObject({
      sessionId: OCCURRENCE.sessionId,
      date: '2026-11-10',
      statut: 'planifiee',
      plan: {
        durationMinutes: 60,
        targetDistanceMeters: 10000,
        targetHrZonePercentages: [0, 50, 50, 0, 0],
      },
      realise: {
        type: 'running',
        durationSeconds: 3500,
        distanceMeters: 9500,
        averageHeartRate: 152,
        hrTimeInZone: [0, 900, 1500, 800, 300],
        perceivedEffort: 6,
        feeling: 2,
      },
      atteinte: { distanceRate: 0.95, durationRate: 1.02 },
    });
    expect(dto.seance.plan.modules).toEqual([
      {
        position: 1,
        type: 'series',
        durationMinutes: 40,
        instruction: '4 x 1 km',
        targetZones: null,
        perceivedEffort: 7,
      },
    ]);
  });

  it('renvoie un réalisé et une atteinte vides pour une séance sans activité rapprochée', () => {
    const dto = buildSessionExport(
      { ...OCCURRENCE, linkedActivityId: null, achievement: null },
      null,
    );

    expect(dto.seance.realise).toBeNull();
    expect(dto.seance.atteinte).toBeNull();
    expect(dto.seance.plan.durationMinutes).toBe(60);
  });

  it('ne reprend pas le réalisé d’une activité d’un autre jour que la séance', () => {
    const dto = buildSessionExport(OCCURRENCE, {
      ...DETAIL,
      startedAt: new Date('2026-11-12T08:00:00.000Z'),
    });

    expect(dto.seance.realise).toBeNull();
    expect(dto.seance.atteinte).toBeNull();
  });

  it('ne reprend que les champs listés : aucun identifiant Garmin ni donnée brute', () => {
    const dto = buildSessionExport(OCCURRENCE, {
      ...DETAIL,
      ...({
        garminActivityId: 'garmin-1',
        rawPayload: { secret: true },
      } as object),
    });
    const json = JSON.stringify(dto);

    expect(json).not.toContain('garmin');
    expect(json).not.toContain('rawPayload');
    expect(json).not.toContain('activite-1');
  });
});
