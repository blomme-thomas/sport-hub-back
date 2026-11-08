import type { DashboardActivityFact } from '../ports/outbound/training-activity.read-model.port.js';
import type { DashboardWindow } from '../value-objects/dashboard-period.vo.js';
import { DashboardStatsCalculator } from './dashboard-stats-calculator.service.js';

const WINDOW: DashboardWindow = {
  current: {
    from: new Date('2026-11-07T00:00:00.000Z'),
    toExclusive: new Date('2026-11-09T00:00:00.000Z'),
  },
  previous: {
    from: new Date('2026-11-05T00:00:00.000Z'),
    toExclusive: new Date('2026-11-07T00:00:00.000Z'),
  },
};

function fact(
  startedAt: string,
  overrides: Partial<Omit<DashboardActivityFact, 'metrics'>> & {
    metrics?: Partial<DashboardActivityFact['metrics']>;
  } = {},
): DashboardActivityFact {
  const { metrics, ...rest } = overrides;
  return {
    type: 'running',
    startedAt: new Date(startedAt),
    durationSeconds: 3600,
    ...rest,
    metrics: {
      calories: null,
      elevationGainMeters: null,
      averageHeartRate: null,
      hrTimeInZone: [null, null, null, null, null],
      ...metrics,
    },
  };
}

describe('DashboardStatsCalculator', () => {
  const calculator = new DashboardStatsCalculator();

  it('ne compte jamais un indicateur absent comme zéro : sommes et moyennes ne portent que sur les valeurs présentes', () => {
    const stats = calculator.compute(
      WINDOW,
      [
        fact('2026-11-07T07:00:00.000Z', {
          metrics: {
            calories: 500,
            averageHeartRate: 140,
            hrTimeInZone: [600, null, null, null, null],
          },
        }),
        fact('2026-11-08T07:00:00.000Z', {
          metrics: {
            averageHeartRate: 160,
            hrTimeInZone: [300, 900, null, null, null],
          },
        }),
      ],
      [],
    );

    expect(stats.totals).toEqual({
      count: 2,
      durationSeconds: 7200,
      calories: 500,
      elevationGainMeters: null,
    });
    expect(stats.averageHeartRate).toBe(150);
    expect(stats.hrTimeInZone).toEqual([900, 900, null, null, null]);
  });

  it('renvoie null pour une somme ou une moyenne sans aucune valeur présente', () => {
    const stats = calculator.compute(
      WINDOW,
      [fact('2026-11-07T07:00:00.000Z')],
      [],
    );

    expect(stats.totals.calories).toBeNull();
    expect(stats.totals.elevationGainMeters).toBeNull();
    expect(stats.averageHeartRate).toBeNull();
    expect(stats.hrTimeInZone).toEqual([null, null, null, null, null]);
  });

  it('ventile par sport dans un ordre stable et renvoie une entrée par jour, jours vides compris', () => {
    const stats = calculator.compute(
      WINDOW,
      [
        fact('2026-11-08T07:00:00.000Z', {
          type: 'cycling',
          durationSeconds: 1200,
        }),
        fact('2026-11-07T07:00:00.000Z', {
          type: 'running',
          durationSeconds: 1800,
        }),
        fact('2026-11-07T18:00:00.000Z', {
          type: 'running',
          durationSeconds: 600,
        }),
      ],
      [],
    );

    expect(stats.bySport).toEqual([
      { type: 'cycling', count: 1, durationSeconds: 1200 },
      { type: 'running', count: 2, durationSeconds: 2400 },
    ]);
    expect(stats.daily).toEqual([
      { date: '2026-11-07', count: 2, durationSeconds: 2400, calories: null },
      { date: '2026-11-08', count: 1, durationSeconds: 1200, calories: null },
    ]);
  });

  it("renvoie la variation 'unknown' quand la période précédente n'a aucune séance", () => {
    const stats = calculator.compute(
      WINDOW,
      [fact('2026-11-07T07:00:00.000Z')],
      [],
    );

    expect(stats.variation).toEqual({ direction: 'unknown', percent: null });
  });

  it('calcule la variation de la durée par rapport à la période précédente', () => {
    const previous = [
      fact('2026-11-05T07:00:00.000Z', { durationSeconds: 2000 }),
    ];

    const up = calculator.compute(
      WINDOW,
      [fact('2026-11-07T07:00:00.000Z', { durationSeconds: 2500 })],
      previous,
    );
    expect(up.variation).toEqual({ direction: 'up', percent: 25 });

    const down = calculator.compute(
      WINDOW,
      [fact('2026-11-07T07:00:00.000Z', { durationSeconds: 1000 })],
      previous,
    );
    expect(down.variation).toEqual({ direction: 'down', percent: -50 });

    const flat = calculator.compute(
      WINDOW,
      [fact('2026-11-07T07:00:00.000Z', { durationSeconds: 2000 })],
      previous,
    );
    expect(flat.variation).toEqual({ direction: 'flat', percent: 0 });
  });
});
