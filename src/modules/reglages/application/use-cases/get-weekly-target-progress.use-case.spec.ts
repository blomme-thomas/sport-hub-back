import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import {
  GetTrainingStatsUseCase,
  type TrainingStatsDto,
} from '../../../training-stats/index.js';
import { InvalidWeekError } from '../../domain/errors/invalid-week.error.js';
import { USER_SETTINGS_REPOSITORY } from '../../domain/ports/outbound/user-settings.repository.port.js';
import { WeeklyTarget } from '../../domain/value-objects/weekly-target.vo.js';
import { GetWeeklyTargetProgressUseCase } from './get-weekly-target-progress.use-case.js';

/** Une période hebdomadaire des statistiques, réduite à ce que lit le cas d'usage. */
function week(start: string, durationSeconds: number) {
  return {
    start: new Date(`${start}T00:00:00.000Z`),
    end: new Date(`${start}T23:59:59.999Z`),
    totals: { count: 1, durationSeconds, distanceMeters: 0 },
  };
}

describe('GetWeeklyTargetProgressUseCase', () => {
  let useCase: GetWeeklyTargetProgressUseCase;
  let target: WeeklyTarget;
  const execute = vi.fn();

  beforeEach(async () => {
    target = WeeklyTarget.create(28800);
    execute.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetWeeklyTargetProgressUseCase,
        {
          provide: USER_SETTINGS_REPOSITORY,
          useValue: { findWeeklyTarget: () => Promise.resolve(target) },
        },
        { provide: GetTrainingStatsUseCase, useValue: { execute } },
      ],
    }).compile();
    useCase = moduleRef.get(GetWeeklyTargetProgressUseCase);
  });

  it('renvoie la cible des réglages, le réalisé de la semaine et huit semaines d’historique', async () => {
    execute.mockResolvedValue({
      periods: [
        week('2026-09-21', 3600),
        week('2026-11-02', 7200),
        week('2026-11-09', 9000),
        week('2026-11-16', 24120),
      ],
    } as unknown as TrainingStatsDto);

    const result = await useCase.execute('2026-W47');

    expect(result.week).toBe('2026-W47');
    expect(result.targetSeconds).toBe(28800);
    expect(result.doneSeconds).toBe(24120);
    expect(result.history).toHaveLength(8);
    expect(result.history.at(-1)).toEqual({
      week: '2026-W47',
      doneSeconds: 24120,
    });
    expect(
      result.history.find((point) => point.week === '2026-W46')?.doneSeconds,
    ).toBe(9000);
    expect(
      result.history.find((point) => point.week === '2026-W45')?.doneSeconds,
    ).toBe(7200);
    expect(
      result.history.find((point) => point.week === '2026-W40')?.doneSeconds,
    ).toBe(0);
    expect(
      result.history.find((point) => point.week === '2026-W39'),
    ).toBeUndefined();
  });

  it('demande les statistiques par semaine, de sept semaines avant le lundi jusqu’au dimanche', async () => {
    execute.mockResolvedValue({ periods: [] } as unknown as TrainingStatsDto);

    await useCase.execute('2026-W46');

    expect(execute).toHaveBeenCalledWith({
      granularity: 'week',
      from: new Date('2026-09-21T00:00:00.000Z'),
      to: new Date('2026-11-15T00:00:00.000Z'),
      type: null,
    });
  });

  it('renvoie une cible nulle sans réglage, sans écarter le réalisé', async () => {
    target = WeeklyTarget.create(null);
    execute.mockResolvedValue({
      periods: [week('2026-11-09', 1800)],
    } as unknown as TrainingStatsDto);

    const result = await useCase.execute('2026-W46');

    expect(result.targetSeconds).toBeNull();
    expect(result.doneSeconds).toBe(1800);
  });

  it('refuse une semaine qui n’est pas une semaine ISO valide, sans appeler les statistiques', async () => {
    await expect(useCase.execute('2026-W54')).rejects.toBeInstanceOf(
      InvalidWeekError,
    );
    await expect(useCase.execute('2026-11-16')).rejects.toBeInstanceOf(
      InvalidWeekError,
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
