import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import type { TrainingStatsDto } from '../../../training-stats/index.js';
import { GetTrainingStatsUseCase } from '../../../training-stats/index.js';
import { Goal } from '../../domain/entities/goal.entity.js';
import { InvalidGoalError } from '../../domain/errors/invalid-goal.error.js';
import {
  GOAL_REPOSITORY,
  type IGoalRepository,
} from '../../domain/ports/outbound/goal.repository.port.js';
import { TargetTime } from '../../domain/value-objects/target-time.vo.js';
import { GetWeeklyGoalUseCase } from './get-weekly-goal.use-case.js';

class FakeGoalRepository implements IGoalRepository {
  readonly goals: Goal[] = [];

  findById(): Promise<Goal | null> {
    return Promise.resolve(null);
  }

  findAll(): Promise<Goal[]> {
    return Promise.resolve([...this.goals]);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

/** Une période hebdomadaire des statistiques, réduite à ce que lit le cas d'usage. */
function week(start: string, durationSeconds: number) {
  return {
    start: new Date(`${start}T00:00:00.000Z`),
    end: new Date(`${start}T23:59:59.999Z`),
    totals: { count: 1, durationSeconds, distanceMeters: 0 },
  };
}

function weeklyGoal(targetSeconds: number): Goal {
  return Goal.create({
    title: 'Volume de la semaine',
    type: 'hebdomadaire',
    targetDate: null,
    eventFormat: null,
    targetTime: TargetTime.create(targetSeconds),
  });
}

describe('GetWeeklyGoalUseCase', () => {
  let useCase: GetWeeklyGoalUseCase;
  let repository: FakeGoalRepository;
  const execute = vi.fn();

  beforeEach(async () => {
    repository = new FakeGoalRepository();
    execute.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetWeeklyGoalUseCase,
        { provide: GOAL_REPOSITORY, useValue: repository },
        { provide: GetTrainingStatsUseCase, useValue: { execute } },
      ],
    }).compile();
    useCase = moduleRef.get(GetWeeklyGoalUseCase);
  });

  it('renvoie la cible et le réalisé de la semaine demandée, avec huit semaines d’historique', async () => {
    repository.goals.push(weeklyGoal(28800));
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
    expect(result.history.find((point) => point.week === '2026-W46')).toEqual({
      week: '2026-W46',
      doneSeconds: 9000,
    });
    expect(result.history.find((point) => point.week === '2026-W45')).toEqual({
      week: '2026-W45',
      doneSeconds: 7200,
    });
    expect(result.history.find((point) => point.week === '2026-W40')).toEqual({
      week: '2026-W40',
      doneSeconds: 0,
    });
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

  it('renvoie une cible nulle sans objectif hebdomadaire, sans écarter le réalisé', async () => {
    execute.mockResolvedValue({
      periods: [week('2026-11-09', 1800)],
    } as unknown as TrainingStatsDto);

    const result = await useCase.execute('2026-W46');

    expect(result.targetSeconds).toBeNull();
    expect(result.doneSeconds).toBe(1800);
  });

  it('refuse une semaine qui n’est pas une semaine ISO valide', async () => {
    await expect(useCase.execute('2026-W54')).rejects.toBeInstanceOf(
      InvalidGoalError,
    );
    await expect(useCase.execute('2026-11-16')).rejects.toBeInstanceOf(
      InvalidGoalError,
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
