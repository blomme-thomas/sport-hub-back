import { plainToInstance } from 'class-transformer';
import { Test } from '@nestjs/testing';
import { GetDashboardStatsUseCase } from '../../../application/use-cases/get-dashboard-stats.use-case.js';
import { GetTrainingStatsUseCase } from '../../../application/use-cases/get-training-stats.use-case.js';
import { GetTrainingStatsRequestDto } from '../dtos/get-training-stats.request.dto.js';
import { TrainingStatsResponseDto } from '../dtos/training-stats.response.dto.js';
import { TrainingStatsController } from './training-stats.controller.js';

const EMPTY_VARIATION = { absolute: 0, percent: null };

function request(plain: Record<string, unknown>): GetTrainingStatsRequestDto {
  return plainToInstance(GetTrainingStatsRequestDto, plain);
}

function statsDto(count: number) {
  return {
    granularity: 'week',
    from: new Date('2026-05-11T00:00:00.000Z'),
    to: new Date('2026-05-31T00:00:00.000Z'),
    type: 'running',
    periods: [
      {
        start: new Date('2026-05-11T00:00:00.000Z'),
        end: new Date('2026-05-18T00:00:00.000Z'),
        totals: { count, durationSeconds: 5400, distanceMeters: 5000 },
        byType: [
          {
            type: 'running',
            count,
            durationSeconds: 5400,
            distanceMeters: 5000,
          },
        ],
        previous: {
          start: new Date('2026-05-04T00:00:00.000Z'),
          end: new Date('2026-05-11T00:00:00.000Z'),
          totals: { count: 0, durationSeconds: 0, distanceMeters: 0 },
          byType: [],
        },
        variation: {
          totals: {
            count: { absolute: count, percent: null },
            durationSeconds: { absolute: 5400, percent: null },
            distanceMeters: { absolute: 5000, percent: null },
          },
          byType: [],
        },
      },
    ],
  };
}

describe('TrainingStatsController', () => {
  let controller: TrainingStatsController;
  const execute = vi.fn();

  beforeEach(async () => {
    execute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [TrainingStatsController],
      providers: [
        { provide: GetTrainingStatsUseCase, useValue: { execute } },
        {
          provide: GetDashboardStatsUseCase,
          useValue: { execute: vi.fn() },
        },
      ],
    }).compile();
    controller = moduleRef.get(TrainingStatsController);
  });

  describe('transmission de la requête', () => {
    it('convertit from et to au format YYYY-MM-DD en dates UTC et transmet la granularité', async () => {
      execute.mockResolvedValue(statsDto(2));

      await controller.get(
        request({ granularity: 'week', from: '2026-05-11', to: '2026-05-31' }),
      );

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          granularity: 'week',
          from: new Date('2026-05-11T00:00:00.000Z'),
          to: new Date('2026-05-31T00:00:00.000Z'),
        }),
      );
    });

    it('transmet le type de la requête', async () => {
      execute.mockResolvedValue(statsDto(2));

      await controller.get(
        request({
          granularity: 'month',
          from: '2026-05-01',
          to: '2026-05-31',
          type: 'running',
        }),
      );

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({ granularity: 'month', type: 'running' }),
      );
    });

    it('transmet une absence de type comme absence de filtre', async () => {
      execute.mockResolvedValue(statsDto(2));

      await controller.get(
        request({ granularity: 'week', from: '2026-05-11', to: '2026-05-31' }),
      );

      const query = execute.mock.calls[0]?.[0] as { type?: string | null };
      expect(query.type ?? null).toBeNull();
    });

    it('déclenche le use case une seule fois par requête', async () => {
      execute.mockResolvedValue(statsDto(2));

      await controller.get(
        request({ granularity: 'week', from: '2026-05-11', to: '2026-05-31' }),
      );

      expect(execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('réponse', () => {
    it('renvoie les statistiques du use case au format de réponse', async () => {
      execute.mockResolvedValue(statsDto(2));

      const response = await controller.get(
        request({ granularity: 'week', from: '2026-05-11', to: '2026-05-31' }),
      );

      expect(response).toBeInstanceOf(TrainingStatsResponseDto);
      expect(response.periods).toHaveLength(1);
      expect(response.periods[0]?.totals).toEqual({
        count: 2,
        durationSeconds: 5400,
        distanceMeters: 5000,
      });
    });

    it('sérialise les dates des périodes en ISO 8601 UTC', async () => {
      execute.mockResolvedValue(statsDto(2));

      const response = await controller.get(
        request({ granularity: 'week', from: '2026-05-11', to: '2026-05-31' }),
      );
      const json = JSON.parse(JSON.stringify(response)) as {
        periods: { start: string; end: string }[];
      };

      expect(json.periods[0]).toMatchObject({
        start: '2026-05-11T00:00:00.000Z',
        end: '2026-05-18T00:00:00.000Z',
      });
    });

    it('renvoie une période sans activité avec des valeurs à zéro', async () => {
      execute.mockResolvedValue({
        ...statsDto(0),
        periods: [
          {
            ...statsDto(0).periods[0],
            byType: [],
            variation: {
              totals: {
                count: EMPTY_VARIATION,
                durationSeconds: EMPTY_VARIATION,
                distanceMeters: EMPTY_VARIATION,
              },
              byType: [],
            },
          },
        ],
      });

      const response = await controller.get(
        request({ granularity: 'week', from: '2026-05-11', to: '2026-05-11' }),
      );

      expect(response.periods[0]?.totals.count).toBe(0);
      expect(response.periods[0]?.byType).toEqual([]);
    });
  });
});
