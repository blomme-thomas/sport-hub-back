import { describe, expect, it } from 'vitest';
import type {
  WeekActivityDetail,
  WeekSessionOccurrence,
  WeekVolumes,
} from '../domain/ports/outbound/week-export.ports.js';
import { buildWeekExport } from './week-export.builder.js';

const MONDAY = new Date('2026-11-09T00:00:00.000Z');
const SUNDAY = new Date('2026-11-15T00:00:00.000Z');

const VOLUMES: WeekVolumes = {
  current: { count: 1, durationSeconds: 3600, distanceMeters: 10000 },
  previous: { count: 2, durationSeconds: 7200, distanceMeters: 15000 },
  variation: { count: -50, durationSeconds: -50, distanceMeters: -33.3 },
};

function occurrence(
  overrides: Partial<WeekSessionOccurrence> = {},
): WeekSessionOccurrence {
  return {
    sessionId: 'session-1',
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
        type: 'echauffement',
        durationMinutes: 10,
        instruction: 'Footing souple',
        targetZones: null,
        perceivedEffort: 3,
      },
    ],
    linkedActivityId: null,
    achievement: null,
    ...overrides,
  };
}

function detail(
  overrides: Partial<WeekActivityDetail> = {},
): WeekActivityDetail {
  return {
    id: 'activity-1',
    type: 'running',
    startedAt: new Date('2026-11-10T17:30:00.000Z'),
    durationSeconds: 3500,
    distanceMeters: 10200,
    averageHeartRate: 150,
    hrTimeInZone: [600, 1800, 1000, 100, null],
    ...overrides,
  };
}

function build(
  input: Partial<Parameters<typeof buildWeekExport>[0]> = {},
): ReturnType<typeof buildWeekExport> {
  return buildWeekExport({
    label: '2026-W46',
    monday: MONDAY,
    sunday: SUNDAY,
    occurrences: [],
    activities: [],
    linkedDetails: new Map(),
    volumes: VOLUMES,
    ...input,
  });
}

describe('buildWeekExport', () => {
  it('renvoie le format bilan-semaine version 1 avec la période et la consigne', () => {
    const result = build();

    expect(result.kind).toBe('bilan-semaine');
    expect(result.schemaVersion).toBe(1);
    expect(result.periode).toEqual({
      semaine: '2026-W46',
      premierJour: '2026-11-09',
      dernierJour: '2026-11-15',
    });
    expect(result.notesPourLAnalyse).toContain('bilan-semaine');
  });

  it('renvoie des listes vides et des totaux nuls pour une semaine sans données', () => {
    const result = build({
      volumes: {
        current: { count: 0, durationSeconds: 0, distanceMeters: 0 },
        previous: { count: 0, durationSeconds: 0, distanceMeters: 0 },
        variation: { count: null, durationSeconds: null, distanceMeters: null },
      },
    });

    expect(result.seances).toEqual([]);
    expect(result.activitesNonPlanifiees).toEqual([]);
    expect(result.resume.seancesPrevues).toBe(0);
    expect(result.resume.distancePrevueMeters).toBeNull();
    expect(result.resume.variation.dureePourcent).toBeNull();
  });

  it('donne un réalisé vide à une séance non réalisée et garde son plan', () => {
    const result = build({ occurrences: [occurrence()] });

    expect(result.seances).toHaveLength(1);
    expect(result.seances[0]).toMatchObject({
      sessionId: 'session-1',
      statut: 'planifiee',
      realise: null,
      atteinte: null,
      plan: {
        durationMinutes: 60,
        targetDistanceMeters: 10000,
        modules: [{ type: 'echauffement', instruction: 'Footing souple' }],
      },
    });
  });

  it('rattache le réalisé et la comparaison quand l’activité liée est du même jour', () => {
    const result = build({
      occurrences: [
        occurrence({
          status: 'realisee',
          linkedActivityId: 'activity-1',
          achievement: {
            distanceRate: 102,
            durationRate: 97.2,
            zoneGapsPoints: [0, 1, -1, 0, 0],
          },
        }),
      ],
      linkedDetails: new Map([['activity-1', detail()]]),
    });

    expect(result.seances[0].realise).toMatchObject({
      type: 'running',
      durationSeconds: 3500,
      distanceMeters: 10200,
      hrTimeInZone: [600, 1800, 1000, 100, null],
    });
    expect(result.seances[0].atteinte).toEqual({
      distanceRate: 102,
      durationRate: 97.2,
      zoneGapsPoints: [0, 1, -1, 0, 0],
    });
  });

  it("ne répète pas l'activité liée d'une série sur une autre semaine", () => {
    const result = build({
      occurrences: [
        occurrence({
          date: '2026-11-17',
          status: 'realisee',
          linkedActivityId: 'activity-1',
          achievement: {
            distanceRate: 100,
            durationRate: 100,
            zoneGapsPoints: null,
          },
        }),
      ],
      linkedDetails: new Map([['activity-1', detail()]]),
    });

    expect(result.seances[0].realise).toBeNull();
    expect(result.seances[0].atteinte).toBeNull();
  });

  it('liste en activitesNonPlanifiees les activités sans séance rapprochée, sans identifiant Garmin', () => {
    const result = build({
      activities: [
        {
          id: 'activity-1',
          type: 'running',
          startedAt: new Date('2026-11-10T17:30:00.000Z'),
          durationSeconds: 3500,
          distanceMeters: 10200,
          averageHeartRate: 150,
        },
        {
          id: 'activity-2',
          type: 'cycling',
          startedAt: new Date('2026-11-12T07:00:00.000Z'),
          durationSeconds: 5400,
          distanceMeters: 40000,
          averageHeartRate: null,
        },
      ],
      occurrences: [
        occurrence({ status: 'realisee', linkedActivityId: 'activity-1' }),
      ],
      linkedDetails: new Map([['activity-1', detail()]]),
    });

    expect(result.activitesNonPlanifiees).toEqual([
      {
        type: 'cycling',
        startedAt: new Date('2026-11-12T07:00:00.000Z'),
        durationSeconds: 5400,
        distanceMeters: 40000,
        averageHeartRate: null,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('garmin');
  });

  it('calcule le résumé : séances par statut, plan et réalisé, semaine précédente et variation', () => {
    const result = build({
      occurrences: [
        occurrence({
          sessionId: 'a',
          status: 'realisee',
          durationMinutes: 60,
          targetDistanceMeters: 10000,
        }),
        occurrence({
          sessionId: 'b',
          status: 'manquee',
          durationMinutes: 45,
          targetDistanceMeters: null,
        }),
        occurrence({
          sessionId: 'c',
          status: 'annulee',
          durationMinutes: 30,
          targetDistanceMeters: 5000,
        }),
        occurrence({
          sessionId: 'd',
          status: 'planifiee',
          durationMinutes: 40,
          targetDistanceMeters: 8000,
        }),
      ],
    });

    expect(result.resume).toEqual({
      seancesPrevues: 3,
      seancesRealisees: 1,
      seancesManquees: 1,
      seancesAnnulees: 1,
      dureePrevueMinutes: 145,
      dureeRealiseeSeconds: 3600,
      distancePrevueMeters: 18000,
      distanceRealiseeMeters: 10000,
      activitesRealisees: 1,
      semainePrecedente: {
        activitesRealisees: 2,
        dureeRealiseeSeconds: 7200,
        distanceRealiseeMeters: 15000,
      },
      variation: {
        activitesPourcent: -50,
        dureePourcent: -50,
        distancePourcent: -33.3,
      },
    });
  });
});
