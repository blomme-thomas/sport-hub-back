import { Test } from '@nestjs/testing';
import {
  DAILY_CALORIES_PROVIDER,
  type DailyCalories,
  type DailyCaloriesWindow,
  type IDailyCaloriesProvider,
} from '../../domain/ports/outbound/daily-calories.provider.port.js';
import {
  TRAINING_ACTIVITY_READ_MODEL,
  type DashboardActivityFact,
  type ITrainingActivityReadModel,
  type TrainingActivityFact,
  type TrainingActivityWindow,
} from '../../domain/ports/outbound/training-activity.read-model.port.js';
import { DashboardStatsCalculator } from '../../domain/services/dashboard-stats-calculator.service.js';
import type { DashboardWindow } from '../../domain/value-objects/dashboard-period.vo.js';
import { GetDashboardStatsUseCase } from './get-dashboard-stats.use-case.js';

const NOW = new Date('2026-11-08T12:00:00.000Z');

function dashboardFact(
  startedAt: string,
  calories: number | null,
): DashboardActivityFact {
  return {
    type: 'running',
    startedAt: new Date(startedAt),
    durationSeconds: 3600,
    metrics: {
      calories,
      elevationGainMeters: null,
      averageHeartRate: null,
      hrTimeInZone: [null, null, null, null, null],
    },
  };
}

class FakeTrainingActivityReadModel implements ITrainingActivityReadModel {
  dashboardFacts: DashboardActivityFact[] = [];

  findFacts(_window: TrainingActivityWindow): Promise<TrainingActivityFact[]> {
    return Promise.resolve([]);
  }

  findDashboardFacts(
    _window: TrainingActivityWindow,
  ): Promise<DashboardActivityFact[]> {
    return Promise.resolve(this.dashboardFacts);
  }
}

class FakeDailyCaloriesProvider implements IDailyCaloriesProvider {
  days: DailyCalories[] = [];
  windows: DailyCaloriesWindow[] = [];
  failure?: Error;

  findDailyCalories(window: DailyCaloriesWindow): Promise<DailyCalories[]> {
    this.windows.push(window);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    return Promise.resolve(this.days);
  }
}

describe('GetDashboardStatsUseCase', () => {
  let useCase: GetDashboardStatsUseCase;
  let readModel: FakeTrainingActivityReadModel;
  let provider: FakeDailyCaloriesProvider;

  beforeEach(async () => {
    readModel = new FakeTrainingActivityReadModel();
    provider = new FakeDailyCaloriesProvider();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetDashboardStatsUseCase,
        {
          provide: DashboardStatsCalculator,
          useValue: new DashboardStatsCalculator(),
        },
        { provide: TRAINING_ACTIVITY_READ_MODEL, useValue: readModel },
        { provide: DAILY_CALORIES_PROVIDER, useValue: provider },
      ],
    }).compile();
    useCase = moduleRef.get(GetDashboardStatsUseCase);
  });

  describe('calories journalières', () => {
    it('demande au fournisseur les calories de la période courante uniquement, pas celles de la période précédente', async () => {
      await useCase.execute('7d', NOW);

      expect(provider.windows).toEqual([
        {
          from: new Date('2026-11-02T00:00:00.000Z'),
          toExclusive: new Date('2026-11-09T00:00:00.000Z'),
        },
      ]);
    });

    it('renvoie totals.calories issu du résumé quotidien et non des calories des activités', async () => {
      readModel.dashboardFacts = [
        dashboardFact('2026-11-07T07:00:00.000Z', 500),
      ];
      provider.days = [
        { date: '2026-11-07', calories: 2350 },
        { date: '2026-11-08', calories: null },
      ];

      const result = await useCase.execute('7d', NOW);

      expect(result.stats.totals.calories).toBe(2350);
    });

    it('renvoie des calories sur les jours sans séance quand le résumé quotidien en porte une', async () => {
      provider.days = [{ date: '2026-11-02', calories: 2100 }];

      const result = await useCase.execute('7d', NOW);

      expect(
        result.stats.daily.find((day) => day.date === '2026-11-02'),
      ).toMatchObject({
        count: 0,
        calories: 2100,
      });
    });

    it('renvoie totals.calories à null quand le résumé quotidien ne renseigne aucun jour', async () => {
      readModel.dashboardFacts = [
        dashboardFact('2026-11-07T07:00:00.000Z', 500),
      ];
      provider.days = [];

      const result = await useCase.execute('7d', NOW);

      expect(result.stats.totals.calories).toBeNull();
    });

    it('propage l erreur du fournisseur de calories sans repli sur les activités', async () => {
      const failure = new Error('Garmin indisponible');
      provider.failure = failure;
      readModel.dashboardFacts = [
        dashboardFact('2026-11-07T07:00:00.000Z', 500),
      ];

      await expect(useCase.execute('7d', NOW)).rejects.toBe(failure);
    });
  });

  describe('fenêtre explicite', () => {
    const WINDOW: DashboardWindow = {
      current: {
        from: new Date('2026-11-02T00:00:00.000Z'),
        toExclusive: new Date('2026-11-09T00:00:00.000Z'),
      },
      previous: {
        from: new Date('2026-10-26T00:00:00.000Z'),
        toExclusive: new Date('2026-11-02T00:00:00.000Z'),
      },
    };

    it('demande au fournisseur les calories de la fenêtre courante fournie', async () => {
      await useCase.executeForWindow(WINDOW);

      expect(provider.windows).toEqual([
        {
          from: new Date('2026-11-02T00:00:00.000Z'),
          toExclusive: new Date('2026-11-09T00:00:00.000Z'),
        },
      ]);
    });

    it('renvoie les calories journalières de la fenêtre explicite', async () => {
      provider.days = [{ date: '2026-11-05', calories: 1900 }];

      const stats = await useCase.executeForWindow(WINDOW);

      expect(
        stats.daily.find((day) => day.date === '2026-11-05')?.calories,
      ).toBe(1900);
    });
  });
});
