import { InvalidStatsRangeError } from '../errors/invalid-stats-range.error.js';
import { StatsRangeTooLargeError } from '../errors/stats-range-too-large.error.js';
import { StatsRange } from './stats-range.vo.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FIRST_MONDAY = new Date('2026-01-05T00:00:00.000Z');

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('StatsRange', () => {
  describe('validation', () => {
    it('lève une erreur de plage invalide quand from est après to', () => {
      const error = captureError(() =>
        StatsRange.create({
          from: new Date('2026-05-31T00:00:00.000Z'),
          to: new Date('2026-05-01T00:00:00.000Z'),
          granularity: 'month',
        }),
      );

      expect(error).toBeInstanceOf(InvalidStatsRangeError);
      expect(error).toMatchObject({ code: 'STATS_RANGE_INVALID' });
    });

    it('accepte une plage réduite à une seule période quand from est égal à to', () => {
      const range = StatsRange.create({
        from: new Date('2026-05-13T00:00:00.000Z'),
        to: new Date('2026-05-13T00:00:00.000Z'),
        granularity: 'week',
      });

      expect(range.periods()).toHaveLength(1);
    });

    it('accepte 104 semaines consécutives', () => {
      const range = StatsRange.create({
        from: FIRST_MONDAY,
        to: new Date(FIRST_MONDAY.getTime() + 103 * WEEK_MS),
        granularity: 'week',
      });

      expect(range.periods()).toHaveLength(104);
    });

    it('refuse 105 semaines consécutives', () => {
      const error = captureError(() =>
        StatsRange.create({
          from: FIRST_MONDAY,
          to: new Date(FIRST_MONDAY.getTime() + 104 * WEEK_MS),
          granularity: 'week',
        }),
      );

      expect(error).toBeInstanceOf(StatsRangeTooLargeError);
      expect(error).toMatchObject({ code: 'STATS_RANGE_TOO_LARGE' });
    });

    it('accepte 104 mois consécutifs', () => {
      const range = StatsRange.create({
        from: new Date(Date.UTC(2026, 0, 1)),
        to: new Date(Date.UTC(2034, 7, 1)),
        granularity: 'month',
      });

      expect(range.periods()).toHaveLength(104);
    });

    it('refuse 105 mois consécutifs', () => {
      const error = captureError(() =>
        StatsRange.create({
          from: new Date(Date.UTC(2026, 0, 1)),
          to: new Date(Date.UTC(2034, 8, 1)),
          granularity: 'month',
        }),
      );

      expect(error).toBeInstanceOf(StatsRangeTooLargeError);
      expect(error).toMatchObject({ code: 'STATS_RANGE_TOO_LARGE' });
    });
  });

  describe('périodes', () => {
    it('renvoie les périodes en ordre chronologique', () => {
      const range = StatsRange.create({
        from: new Date('2026-05-13T00:00:00.000Z'),
        to: new Date('2026-06-02T00:00:00.000Z'),
        granularity: 'week',
      });

      const starts = range.periods().map((period) => period.start.getTime());

      expect(starts).toEqual([...starts].sort((a, b) => a - b));
      expect(range.periods().map((period) => period.start)).toEqual([
        new Date('2026-05-11T00:00:00.000Z'),
        new Date('2026-05-18T00:00:00.000Z'),
        new Date('2026-05-25T00:00:00.000Z'),
        new Date('2026-06-01T00:00:00.000Z'),
      ]);
    });

    it('couvre la semaine complète quand la plage commence en milieu de semaine', () => {
      const range = StatsRange.create({
        from: new Date('2026-05-13T00:00:00.000Z'),
        to: new Date('2026-05-13T00:00:00.000Z'),
        granularity: 'week',
      });

      const [period] = range.periods();

      expect(period?.start).toEqual(new Date('2026-05-11T00:00:00.000Z'));
      expect(period?.end).toEqual(new Date('2026-05-18T00:00:00.000Z'));
    });

    it('inclut le mois de fin quand la plage traverse un changement d’année', () => {
      const range = StatsRange.create({
        from: new Date('2026-12-15T00:00:00.000Z'),
        to: new Date('2027-01-10T00:00:00.000Z'),
        granularity: 'month',
      });

      expect(range.periods().map((period) => period.start)).toEqual([
        new Date('2026-12-01T00:00:00.000Z'),
        new Date('2027-01-01T00:00:00.000Z'),
      ]);
    });
  });

  describe('fenêtre de lecture', () => {
    it('commence à la période précédant la première et finit à la borne exclusive de la dernière', () => {
      const range = StatsRange.create({
        from: new Date('2026-05-13T00:00:00.000Z'),
        to: new Date('2026-05-13T00:00:00.000Z'),
        granularity: 'week',
      });

      expect(range.queryWindow()).toMatchObject({
        from: new Date('2026-05-04T00:00:00.000Z'),
        toExclusive: new Date('2026-05-18T00:00:00.000Z'),
      });
    });

    it('remonte au mois précédent le premier mois de la plage', () => {
      const range = StatsRange.create({
        from: new Date('2026-03-15T00:00:00.000Z'),
        to: new Date('2026-03-20T00:00:00.000Z'),
        granularity: 'month',
      });

      expect(range.queryWindow()).toMatchObject({
        from: new Date('2026-02-01T00:00:00.000Z'),
        toExclusive: new Date('2026-04-01T00:00:00.000Z'),
      });
    });
  });
});
