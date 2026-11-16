import { describe, expect, it, vi } from 'vitest';
import { ExportWeekInvalidError } from '../../domain/errors/export-week-invalid.error.js';
import type {
  IWeekActivitiesSource,
  IWeekSessionsSource,
  IWeekVolumesSource,
} from '../../domain/ports/outbound/week-export.ports.js';
import { ExportWeekUseCase } from './export-week.use-case.js';

const EMPTY_VOLUMES = {
  current: { count: 0, durationSeconds: 0, distanceMeters: 0 },
  previous: { count: 0, durationSeconds: 0, distanceMeters: 0 },
  variation: { count: null, durationSeconds: null, distanceMeters: null },
};

function setup(
  overrides: {
    sessions?: Partial<IWeekSessionsSource>;
    activities?: Partial<IWeekActivitiesSource>;
    volumes?: Partial<IWeekVolumesSource>;
  } = {},
) {
  const sessions: IWeekSessionsSource = {
    findOccurrences: vi.fn().mockResolvedValue([]),
    ...overrides.sessions,
  };
  const activities: IWeekActivitiesSource = {
    findBetween: vi.fn().mockResolvedValue([]),
    findDetail: vi.fn().mockResolvedValue(null),
    ...overrides.activities,
  };
  const volumes: IWeekVolumesSource = {
    findWeek: vi.fn().mockResolvedValue(EMPTY_VOLUMES),
    ...overrides.volumes,
  };
  return {
    sessions,
    activities,
    volumes,
    useCase: new ExportWeekUseCase(sessions, activities, volumes),
  };
}

describe('ExportWeekUseCase', () => {
  it('rejette un libellé de semaine invalide', async () => {
    const { useCase } = setup();

    await expect(useCase.execute('2026-W54')).rejects.toBeInstanceOf(
      ExportWeekInvalidError,
    );
    await expect(useCase.execute('2026-46')).rejects.toBeInstanceOf(
      ExportWeekInvalidError,
    );
  });

  it('interroge les sources sur les bornes du lundi au dimanche de la semaine', async () => {
    const { useCase, sessions, activities, volumes } = setup();

    const result = await useCase.execute('2026-W46');

    expect(sessions.findOccurrences).toHaveBeenCalledWith(
      '2026-11-09',
      '2026-11-15',
    );
    expect(activities.findBetween).toHaveBeenCalledWith(
      new Date('2026-11-09T00:00:00.000Z'),
      new Date('2026-11-16T00:00:00.000Z'),
    );
    expect(volumes.findWeek).toHaveBeenCalledWith(
      new Date('2026-11-09T00:00:00.000Z'),
    );
    expect(result.periode.premierJour).toBe('2026-11-09');
  });

  it('charge le réalisé une seule fois par activité liée et ignore les activités introuvables', async () => {
    const findDetail = vi.fn().mockResolvedValue(null);
    const { useCase, activities } = setup({
      sessions: {
        findOccurrences: vi.fn().mockResolvedValue([
          {
            sessionId: 's1',
            date: '2026-11-10',
            startTime: null,
            disciplineTypeKey: 'running',
            status: 'realisee',
            durationMinutes: 60,
            targetDistanceMeters: null,
            targetHrZonePercentages: null,
            modules: [],
            linkedActivityId: 'a1',
            achievement: null,
          },
          {
            sessionId: 's2',
            date: '2026-11-11',
            startTime: null,
            disciplineTypeKey: 'running',
            status: 'realisee',
            durationMinutes: 60,
            targetDistanceMeters: null,
            targetHrZonePercentages: null,
            modules: [],
            linkedActivityId: 'a1',
            achievement: null,
          },
        ]),
      },
      activities: { findDetail },
    });

    const result = await useCase.execute('2026-W46');

    expect(findDetail).toHaveBeenCalledTimes(1);
    expect(findDetail).toHaveBeenCalledWith('a1');
    expect(result.seances.every((seance) => seance.realise === null)).toBe(
      true,
    );
    expect(activities.findBetween).toHaveBeenCalledTimes(1);
  });
});
