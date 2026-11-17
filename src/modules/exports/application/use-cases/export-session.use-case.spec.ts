import { describe, expect, it, vi } from 'vitest';
import { ExportSessionNotFoundError } from '../../domain/errors/export-session-not-found.error.js';
import type { WeekSessionOccurrence } from '../../domain/ports/outbound/week-export.ports.js';
import { ExportSessionUseCase } from './export-session.use-case.js';

const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function occurrence(linkedActivityId: string | null): WeekSessionOccurrence {
  return {
    sessionId: SESSION_ID,
    date: '2026-11-10',
    startTime: null,
    disciplineTypeKey: 'running',
    status: 'realisee',
    durationMinutes: 45,
    targetDistanceMeters: null,
    targetHrZonePercentages: null,
    modules: [],
    linkedActivityId,
    achievement: null,
  };
}

describe('ExportSessionUseCase', () => {
  it('ne lit aucune activité pour une séance sans activité rapprochée', async () => {
    const findSession = vi.fn().mockResolvedValue(occurrence(null));
    const findDetail = vi.fn();

    const dto = await new ExportSessionUseCase(
      { findSession },
      { findBetween: vi.fn(), findDetail },
    ).execute(SESSION_ID);

    expect(dto.seance.realise).toBeNull();
    expect(findDetail).not.toHaveBeenCalled();
  });

  it('lit le détail de l’activité rapprochée', async () => {
    const findSession = vi.fn().mockResolvedValue(occurrence('activite-1'));
    const findDetail = vi.fn().mockResolvedValue({
      id: 'activite-1',
      type: 'running',
      startedAt: new Date('2026-11-10T07:30:00.000Z'),
      durationSeconds: 2600,
      distanceMeters: 7000,
      averageHeartRate: 150,
      hrTimeInZone: [0, 0, 2600, 0, 0],
      perceivedEffort: null,
      feeling: null,
    });

    const dto = await new ExportSessionUseCase(
      { findSession },
      { findBetween: vi.fn(), findDetail },
    ).execute(SESSION_ID);

    expect(findDetail).toHaveBeenCalledWith('activite-1');
    expect(dto.seance.realise?.durationSeconds).toBe(2600);
  });

  it('refuse une séance inconnue', async () => {
    const findSession = vi.fn().mockResolvedValue(null);

    await expect(
      new ExportSessionUseCase(
        { findSession },
        { findBetween: vi.fn(), findDetail: vi.fn() },
      ).execute(SESSION_ID),
    ).rejects.toBeInstanceOf(ExportSessionNotFoundError);
  });
});
