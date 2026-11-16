import { describe, expect, it } from 'vitest';
import type {
  WeekActivity,
  WeekSessionOccurrence,
} from '../domain/ports/outbound/week-export.ports.js';
import { parseExportMonth } from '../domain/value-objects/export-month.vo.js';
import { buildMonthExport, type MonthWeek } from './month-export.builder.js';

const NOVEMBER = parseExportMonth('2026-11');
if (NOVEMBER === null) {
  throw new Error('mois de test invalide');
}

// Semaines ISO qui touchent novembre 2026 : W44 (26 oct - 1 nov) à W49 (30 nov - 6 déc).
const WEEKS: MonthWeek[] = [
  {
    label: '2026-W44',
    monday: new Date('2026-10-26T00:00:00Z'),
    sunday: new Date('2026-11-01T00:00:00Z'),
  },
  {
    label: '2026-W45',
    monday: new Date('2026-11-02T00:00:00Z'),
    sunday: new Date('2026-11-08T00:00:00Z'),
  },
  {
    label: '2026-W46',
    monday: new Date('2026-11-09T00:00:00Z'),
    sunday: new Date('2026-11-15T00:00:00Z'),
  },
  {
    label: '2026-W47',
    monday: new Date('2026-11-16T00:00:00Z'),
    sunday: new Date('2026-11-22T00:00:00Z'),
  },
  {
    label: '2026-W48',
    monday: new Date('2026-11-23T00:00:00Z'),
    sunday: new Date('2026-11-29T00:00:00Z'),
  },
  {
    label: '2026-W49',
    monday: new Date('2026-11-30T00:00:00Z'),
    sunday: new Date('2026-12-06T00:00:00Z'),
  },
];

function occurrence(date: string, sessionId: string): WeekSessionOccurrence {
  return {
    sessionId,
    date,
    startTime: null,
    disciplineTypeKey: 'running',
    status: 'planifiee',
    durationMinutes: 45,
    targetDistanceMeters: null,
    targetHrZonePercentages: null,
    modules: [],
    linkedActivityId: null,
    achievement: null,
  };
}

function activity(id: string, startedAt: string): WeekActivity {
  return {
    id,
    type: 'running',
    startedAt: new Date(startedAt),
    durationSeconds: 1800,
    distanceMeters: 5000,
    averageHeartRate: null,
  };
}

function build(
  occurrences: WeekSessionOccurrence[],
  activities: WeekActivity[] = [],
) {
  return buildMonthExport({
    label: '2026-11',
    first: NOVEMBER.first,
    last: NOVEMBER.last,
    weeks: WEEKS,
    occurrences,
    activities,
    linkedDetails: new Map(),
  });
}

describe('buildMonthExport', () => {
  it('renvoie le format bilan-mois version 1 avec le mois du 1er au dernier jour', () => {
    const result = build([]);

    expect(result.kind).toBe('bilan-mois');
    expect(result.schemaVersion).toBe(1);
    expect(result.periode).toEqual({
      mois: '2026-11',
      premierJour: '2026-11-01',
      dernierJour: '2026-11-30',
    });
  });

  it('exclut les séances et activités hors du mois, même si leur semaine ISO est dans le mois', () => {
    const result = build(
      [
        occurrence('2026-10-31', 'octobre'),
        occurrence('2026-12-01', 'decembre'),
      ],
      [
        activity('oct', '2026-10-31T10:00:00Z'),
        activity('dec', '2026-12-01T10:00:00Z'),
      ],
    );

    expect(result.resume.seancesPrevues).toBe(0);
    expect(result.resume.activitesRealisees).toBe(0);
    expect(result.semaines.flatMap((week) => week.seances)).toEqual([]);
    expect(
      result.semaines.flatMap((week) => week.activitesNonPlanifiees),
    ).toEqual([]);
  });

  it('marque partielle la semaine qui déborde et ne la reprend que pour les jours du mois', () => {
    const result = build([occurrence('2026-11-01', 'premier-jour')]);

    const first = result.semaines[0];
    expect(first).toMatchObject({
      semaine: '2026-W44',
      premierJour: '2026-11-01',
      dernierJour: '2026-11-01',
      partielle: true,
    });
    expect(first.seances.map((s) => s.sessionId)).toEqual(['premier-jour']);
    expect(result.semaines[1].partielle).toBe(false);
    expect(result.semaines[5]).toMatchObject({
      semaine: '2026-W49',
      premierJour: '2026-11-30',
      dernierJour: '2026-11-30',
      partielle: true,
    });
  });

  it('range chaque séance et activité du mois dans une seule semaine', () => {
    const result = build(
      [
        occurrence('2026-11-01', 'a'),
        occurrence('2026-11-10', 'b'),
        occurrence('2026-11-30', 'c'),
      ],
      [
        activity('x', '2026-11-01T08:00:00Z'),
        activity('y', '2026-11-11T08:00:00Z'),
      ],
    );

    const sessionIds = result.semaines.flatMap((week) =>
      week.seances.map((s) => s.sessionId),
    );
    expect(sessionIds.sort()).toEqual(['a', 'b', 'c']);
    const activityIds = result.semaines.flatMap((week) =>
      week.activitesNonPlanifiees.map((a) => a.startedAt.toISOString()),
    );
    expect(activityIds).toHaveLength(2);
    expect(result.resume).toMatchObject({
      seancesPrevues: 3,
      activitesRealisees: 2,
      dureeRealiseeSeconds: 3600,
      distanceRealiseeMeters: 10000,
    });
  });

  it('renvoie des listes vides et des totaux nuls pour un mois sans données', () => {
    const result = build([]);

    expect(result.resume).toMatchObject({
      seancesPrevues: 0,
      activitesRealisees: 0,
      dureeRealiseeSeconds: 0,
      distancePrevueMeters: null,
    });
    expect(result.semaines.every((week) => week.seances.length === 0)).toBe(
      true,
    );
  });
});
