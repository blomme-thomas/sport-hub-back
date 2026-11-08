import type { GetTrainingStatsUseCase } from '../../../training-stats/index.js';
import type {
  TrainingStatsDto,
  PeriodStatsDto,
  VolumeDto,
  VariationDto,
} from '../../../training-stats/index.js';
import { TrainingStatsContextAdapter } from './training-stats-context.adapter.js';

const ZERO_METRIC = { absolute: 0, percent: null };

const ZERO_VARIATION: VariationDto = {
  count: ZERO_METRIC,
  durationSeconds: ZERO_METRIC,
  distanceMeters: ZERO_METRIC,
};

function period(
  start: string,
  end: string,
  totals: VolumeDto,
  byType: PeriodStatsDto['byType'] = [],
): PeriodStatsDto {
  return {
    start: new Date(start),
    end: new Date(end),
    totals,
    byType,
    previous: {
      start: new Date(start),
      end: new Date(start),
      totals: { count: 0, durationSeconds: 0, distanceMeters: 0 },
      byType: [],
    },
    variation: { totals: ZERO_VARIATION, byType: [] },
  };
}

function statsDto(periods: PeriodStatsDto[]): TrainingStatsDto {
  return {
    granularity: 'week',
    from: new Date('2026-10-05T00:00:00.000Z'),
    to: new Date('2026-11-01T00:00:00.000Z'),
    type: null,
    periods,
  };
}

describe('TrainingStatsContextAdapter', () => {
  let execute: ReturnType<typeof vi.fn>;
  let now: Date;

  function adapter() {
    const stats = { execute } as unknown as GetTrainingStatsUseCase;
    return new TrainingStatsContextAdapter(stats, () => now);
  }

  beforeEach(() => {
    now = new Date('2026-11-04T12:00:00.000Z');
    execute = vi.fn().mockResolvedValue(statsDto([]));
  });

  describe('fenêtre de semaines complètes', () => {
    it('interroge les semaines complètes qui précèdent la semaine courante', async () => {
      await adapter().getRecent(4);

      expect(execute).toHaveBeenCalledWith({
        granularity: 'week',
        from: new Date('2026-10-05T00:00:00.000Z'),
        to: new Date('2026-11-01T00:00:00.000Z'),
        type: null,
      });
    });

    it('ne demande qu une seule fois les statistiques par appel', async () => {
      await adapter().getRecent(4);

      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('ne retient qu une seule semaine complète quand une seule est demandée', async () => {
      await adapter().getRecent(1);

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          from: new Date('2026-10-26T00:00:00.000Z'),
          to: new Date('2026-11-01T00:00:00.000Z'),
        }),
      );
    });

    it('considère encore la semaine précédente le dimanche soir UTC', async () => {
      now = new Date('2026-11-01T23:59:59.000Z');

      await adapter().getRecent(1);

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          from: new Date('2026-10-19T00:00:00.000Z'),
          to: new Date('2026-10-25T00:00:00.000Z'),
        }),
      );
    });

    it('passe à la semaine suivante le lundi à minuit UTC', async () => {
      now = new Date('2026-11-02T00:00:00.000Z');

      await adapter().getRecent(1);

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          from: new Date('2026-10-26T00:00:00.000Z'),
          to: new Date('2026-11-01T00:00:00.000Z'),
        }),
      );
    });
  });

  describe('mapping vers le contexte récent', () => {
    it('renvoie une semaine de contexte par période de statistiques', async () => {
      execute.mockResolvedValue(
        statsDto([
          period(
            '2026-10-26T00:00:00.000Z',
            '2026-11-01T23:59:59.999Z',
            { count: 3, durationSeconds: 5400, distanceMeters: 15432 },
            [
              {
                type: 'running',
                count: 3,
                durationSeconds: 5400,
                distanceMeters: 15432,
              },
            ],
          ),
        ]),
      );

      const context = await adapter().getRecent(1);

      expect(context.weeks).toEqual([
        {
          start: new Date('2026-10-26T00:00:00.000Z'),
          end: new Date('2026-11-01T23:59:59.999Z'),
          activityCount: 3,
          durationSeconds: 5400,
          distanceMeters: 15432,
          byType: [
            {
              type: 'running',
              activityCount: 3,
              durationSeconds: 5400,
              distanceMeters: 15432,
            },
          ],
        },
      ]);
    });

    it('conserve l ordre chronologique des semaines renvoyées par les statistiques', async () => {
      execute.mockResolvedValue(
        statsDto([
          period('2026-10-19T00:00:00.000Z', '2026-10-25T23:59:59.999Z', {
            count: 1,
            durationSeconds: 1800,
            distanceMeters: 4000,
          }),
          period('2026-10-26T00:00:00.000Z', '2026-11-01T23:59:59.999Z', {
            count: 2,
            durationSeconds: 3600,
            distanceMeters: 9000,
          }),
        ]),
      );

      const context = await adapter().getRecent(2);

      expect(context.weeks.map((w) => w.activityCount)).toEqual([1, 2]);
      expect(context.weeks[0]?.start).toEqual(
        new Date('2026-10-19T00:00:00.000Z'),
      );
    });

    it('renvoie une semaine sans activité avec des valeurs à zéro', async () => {
      execute.mockResolvedValue(
        statsDto([
          period('2026-10-26T00:00:00.000Z', '2026-11-01T23:59:59.999Z', {
            count: 0,
            durationSeconds: 0,
            distanceMeters: 0,
          }),
        ]),
      );

      const context = await adapter().getRecent(1);

      expect(context.weeks[0]).toMatchObject({
        activityCount: 0,
        durationSeconds: 0,
        distanceMeters: 0,
        byType: [],
      });
    });

    it('propage une erreur des statistiques sans la transformer', async () => {
      const failure = new Error('lecture impossible');
      execute.mockRejectedValue(failure);

      await expect(adapter().getRecent(4)).rejects.toBe(failure);
    });
  });
});
