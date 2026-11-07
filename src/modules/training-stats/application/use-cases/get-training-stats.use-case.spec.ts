import { Test } from '@nestjs/testing';
import { InvalidStatsRangeError } from '../../domain/errors/invalid-stats-range.error.js';
import { StatsRangeTooLargeError } from '../../domain/errors/stats-range-too-large.error.js';
import {
  TRAINING_ACTIVITY_READ_MODEL,
  type ITrainingActivityReadModel,
  type TrainingActivityFact,
  type TrainingActivityWindow,
} from '../../domain/ports/outbound/training-activity.read-model.port.js';
import { TrainingStatsCalculator } from '../../domain/services/training-stats-calculator.service.js';
import type { TrainingStatsQuery } from '../dtos/training-stats.dto.js';
import { GetTrainingStatsUseCase } from './get-training-stats.use-case.js';

function fact(
  type: string,
  startedAt: string,
  overrides: Partial<TrainingActivityFact> = {},
): TrainingActivityFact {
  return {
    type,
    startedAt: new Date(startedAt),
    durationSeconds: 3600,
    distanceMeters: 10000,
    ...overrides,
  };
}

function weekQuery(
  overrides: Partial<TrainingStatsQuery> = {},
): TrainingStatsQuery {
  return {
    granularity: 'week',
    from: new Date('2026-05-13T00:00:00.000Z'),
    to: new Date('2026-05-13T00:00:00.000Z'),
    type: null,
    ...overrides,
  };
}

class FakeTrainingActivityReadModel implements ITrainingActivityReadModel {
  facts: TrainingActivityFact[] = [];
  windows: TrainingActivityWindow[] = [];

  findFacts(window: TrainingActivityWindow): Promise<TrainingActivityFact[]> {
    this.windows.push(window);
    return Promise.resolve(this.facts);
  }
}

describe('GetTrainingStatsUseCase', () => {
  let useCase: GetTrainingStatsUseCase;
  let readModel: FakeTrainingActivityReadModel;

  beforeEach(async () => {
    readModel = new FakeTrainingActivityReadModel();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetTrainingStatsUseCase,
        {
          provide: TrainingStatsCalculator,
          useValue: new TrainingStatsCalculator(),
        },
        { provide: TRAINING_ACTIVITY_READ_MODEL, useValue: readModel },
      ],
    }).compile();
    useCase = moduleRef.get(GetTrainingStatsUseCase);
  });

  describe('fenêtre de lecture', () => {
    it('interroge le port avec la période précédente et la borne exclusive de la dernière période', async () => {
      await useCase.execute(weekQuery());

      expect(readModel.windows).toEqual([
        {
          from: new Date('2026-05-04T00:00:00.000Z'),
          toExclusive: new Date('2026-05-18T00:00:00.000Z'),
          type: null,
        },
      ]);
    });

    it('transmet le filtre de type au port', async () => {
      await useCase.execute(weekQuery({ type: 'running' }));

      expect(readModel.windows[0]?.type).toBe('running');
    });

    it('interroge le port une seule fois par appel', async () => {
      await useCase.execute(weekQuery());

      expect(readModel.windows).toHaveLength(1);
    });
  });

  describe('statistiques renvoyées', () => {
    it('renvoie les totaux et la ventilation par type de la période', async () => {
      readModel.facts = [
        fact('running', '2026-05-11T06:00:00.000Z', {
          durationSeconds: 1800,
          distanceMeters: 5000,
        }),
        fact('running', '2026-05-12T06:00:00.000Z', {
          durationSeconds: 3600,
          distanceMeters: null,
        }),
      ];

      const result = await useCase.execute(weekQuery());

      expect(result.periods[0]?.totals).toEqual({
        count: 2,
        durationSeconds: 5400,
        distanceMeters: 5000,
      });
      expect(result.periods[0]?.byType).toEqual([
        {
          type: 'running',
          count: 2,
          durationSeconds: 5400,
          distanceMeters: 5000,
        },
      ]);
    });

    it('renvoie la comparaison avec la période précédente et la variation', async () => {
      readModel.facts = [
        fact('running', '2026-05-05T06:00:00.000Z'),
        fact('running', '2026-05-12T06:00:00.000Z'),
        fact('running', '2026-05-13T06:00:00.000Z'),
      ];

      const result = await useCase.execute(weekQuery());

      expect(result.periods[0]?.totals.count).toBe(2);
      expect(result.periods[0]?.previous.totals.count).toBe(1);
      expect(result.periods[0]?.variation.totals.count).toEqual({
        absolute: 1,
        percent: 100,
      });
    });

    it('renvoie des zéros et une ventilation vide pour une période sans activité', async () => {
      const result = await useCase.execute(weekQuery());

      expect(result.periods).toHaveLength(1);
      expect(result.periods[0]?.totals).toEqual({
        count: 0,
        durationSeconds: 0,
        distanceMeters: 0,
      });
      expect(result.periods[0]?.byType).toEqual([]);
      expect(result.periods[0]?.variation.totals.count).toEqual({
        absolute: 0,
        percent: null,
      });
    });

    it('n’inclut dans les totaux que le type demandé', async () => {
      readModel.facts = [
        fact('running', '2026-05-12T06:00:00.000Z'),
        fact('cycling', '2026-05-12T08:00:00.000Z'),
      ];

      const result = await useCase.execute(weekQuery({ type: 'running' }));

      expect(result.periods[0]?.totals.count).toBe(1);
      expect(result.periods[0]?.byType.map((entry) => entry.type)).toEqual([
        'running',
      ]);
    });
  });

  describe('paramètres invalides', () => {
    it('refuse une plage inversée sans interroger le port', async () => {
      await expect(
        useCase.execute(
          weekQuery({
            from: new Date('2026-05-31T00:00:00.000Z'),
            to: new Date('2026-05-01T00:00:00.000Z'),
          }),
        ),
      ).rejects.toBeInstanceOf(InvalidStatsRangeError);
      expect(readModel.windows).toHaveLength(0);
    });

    it('refuse une plage de plus de 104 périodes sans interroger le port', async () => {
      await expect(
        useCase.execute(
          weekQuery({
            granularity: 'month',
            from: new Date(Date.UTC(2026, 0, 1)),
            to: new Date(Date.UTC(2034, 8, 1)),
          }),
        ),
      ).rejects.toBeInstanceOf(StatsRangeTooLargeError);
      expect(readModel.windows).toHaveLength(0);
    });
  });
});
