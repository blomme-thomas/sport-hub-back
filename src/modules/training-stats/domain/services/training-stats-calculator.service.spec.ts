import type { TrainingActivityFact } from '../ports/outbound/training-activity.read-model.port.js';
import { StatsRange } from '../value-objects/stats-range.vo.js';
import { TrainingStatsCalculator } from './training-stats-calculator.service.js';

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

function range(
  from: string,
  to: string,
  granularity: 'week' | 'month',
): StatsRange {
  return StatsRange.create({
    from: new Date(from),
    to: new Date(to),
    granularity,
  });
}

describe('TrainingStatsCalculator', () => {
  const calculator = new TrainingStatsCalculator();

  describe('rattachement aux périodes', () => {
    it('rattache une activité du lundi 00:00:00.000 à la semaine qui commence ce lundi', () => {
      const stats = calculator.compute(
        range('2026-10-26T00:00:00.000Z', '2026-11-02T00:00:00.000Z', 'week'),
        [
          fact('running', '2026-11-01T23:59:59.999Z'),
          fact('running', '2026-11-02T00:00:00.000Z'),
        ],
        null,
      );

      expect(stats.map((period) => period.totals.count)).toEqual([1, 1]);
    });

    it('rattache une activité du dernier jour du mois à 23:59:59.999 au mois en cours', () => {
      const stats = calculator.compute(
        range('2026-01-01T00:00:00.000Z', '2026-02-28T00:00:00.000Z', 'month'),
        [
          fact('running', '2026-01-31T23:59:59.999Z'),
          fact('running', '2026-02-01T00:00:00.000Z'),
        ],
        null,
      );

      expect(stats.map((period) => period.totals.count)).toEqual([1, 1]);
      expect(stats[1]?.period.start).toEqual(
        new Date('2026-02-01T00:00:00.000Z'),
      );
    });

    it('ignore une activité postérieure à la dernière période de la plage', () => {
      const stats = calculator.compute(
        range('2026-10-26T00:00:00.000Z', '2026-11-02T00:00:00.000Z', 'week'),
        [fact('running', '2026-11-09T00:00:00.000Z')],
        null,
      );

      expect(stats.map((period) => period.totals.count)).toEqual([0, 0]);
    });

    it('compte une activité de la semaine précédente uniquement dans la période précédente', () => {
      const stats = calculator.compute(
        range('2026-05-13T00:00:00.000Z', '2026-05-13T00:00:00.000Z', 'week'),
        [fact('running', '2026-05-05T06:00:00.000Z')],
        null,
      );

      expect(stats[0]?.totals.count).toBe(0);
      expect(stats[0]?.previous.totals.count).toBe(1);
    });
  });

  describe('périodes vides', () => {
    it('renvoie des totaux à zéro, une ventilation vide et une variation sans pourcentage', () => {
      const stats = calculator.compute(
        range('2026-03-01T00:00:00.000Z', '2026-03-31T00:00:00.000Z', 'month'),
        [],
        null,
      );

      expect(stats).toHaveLength(1);
      expect(stats[0]?.totals).toMatchObject({
        count: 0,
        durationSeconds: 0,
        distanceMeters: 0,
      });
      expect(stats[0]?.byType).toEqual([]);
      expect(stats[0]?.previous.totals.count).toBe(0);
      expect(stats[0]?.variation.totals.count).toEqual({
        absolute: 0,
        percent: null,
      });
    });
  });

  describe('mois de longueurs différentes', () => {
    it('compare avril (30 jours) à mars (31 jours) et garde le 30 avril jusqu’à 23:59:59.999', () => {
      const stats = calculator.compute(
        range('2026-04-01T00:00:00.000Z', '2026-04-30T00:00:00.000Z', 'month'),
        [
          fact('running', '2026-03-31T23:59:59.999Z'),
          fact('running', '2026-04-30T23:59:59.999Z'),
          fact('running', '2026-05-01T00:00:00.000Z'),
        ],
        null,
      );

      expect(stats[0]?.totals.count).toBe(1);
      expect(stats[0]?.previous.period.start).toEqual(
        new Date('2026-03-01T00:00:00.000Z'),
      );
      expect(stats[0]?.previous.totals.count).toBe(1);
    });
  });

  describe('ventilation par type', () => {
    it('trie la ventilation par type dans l’ordre alphabétique', () => {
      const stats = calculator.compute(
        range('2026-05-13T00:00:00.000Z', '2026-05-13T00:00:00.000Z', 'week'),
        [
          fact('running', '2026-05-12T06:00:00.000Z'),
          fact('strength', '2026-05-12T07:00:00.000Z'),
          fact('cycling', '2026-05-12T08:00:00.000Z'),
        ],
        null,
      );

      expect(stats[0]?.byType.map((entry) => entry.type)).toEqual([
        'cycling',
        'running',
        'strength',
      ]);
    });

    it('cumule séances, durée et distance par type', () => {
      const stats = calculator.compute(
        range('2026-05-13T00:00:00.000Z', '2026-05-13T00:00:00.000Z', 'week'),
        [
          fact('running', '2026-05-11T06:00:00.000Z', {
            durationSeconds: 1800,
            distanceMeters: 5000,
          }),
          fact('running', '2026-05-12T06:00:00.000Z', {
            durationSeconds: 3600,
            distanceMeters: null,
          }),
          fact('cycling', '2026-05-12T08:00:00.000Z', {
            durationSeconds: 7200,
            distanceMeters: 40000,
          }),
        ],
        null,
      );

      const running = stats[0]?.byType.find(
        (entry) => entry.type === 'running',
      );

      expect(running?.volume).toMatchObject({
        count: 2,
        durationSeconds: 5400,
        distanceMeters: 5000,
      });
    });

    it('expose dans la variation un type présent seulement dans la période précédente, avec un courant à zéro', () => {
      const stats = calculator.compute(
        range('2026-05-13T00:00:00.000Z', '2026-05-13T00:00:00.000Z', 'week'),
        [
          fact('cycling', '2026-05-05T08:00:00.000Z'),
          fact('cycling', '2026-05-06T08:00:00.000Z'),
        ],
        null,
      );

      const cycling = stats[0]?.variation.byType.find(
        (entry) => entry.type === 'cycling',
      );

      expect(cycling?.variation.count).toEqual({ absolute: -2, percent: -100 });
    });
  });

  describe('filtre de type', () => {
    it('ne garde que le type demandé dans les totaux et la ventilation', () => {
      const stats = calculator.compute(
        range('2026-05-13T00:00:00.000Z', '2026-05-13T00:00:00.000Z', 'week'),
        [
          fact('running', '2026-05-12T06:00:00.000Z'),
          fact('cycling', '2026-05-12T08:00:00.000Z'),
        ],
        'running',
      );

      expect(stats[0]?.totals.count).toBe(1);
      expect(stats[0]?.byType.map((entry) => entry.type)).toEqual(['running']);
    });

    it('applique le même filtre à la période précédente', () => {
      const stats = calculator.compute(
        range('2026-05-13T00:00:00.000Z', '2026-05-13T00:00:00.000Z', 'week'),
        [
          fact('running', '2026-05-05T06:00:00.000Z'),
          fact('cycling', '2026-05-05T08:00:00.000Z'),
          fact('cycling', '2026-05-06T08:00:00.000Z'),
        ],
        'running',
      );

      expect(stats[0]?.previous.totals.count).toBe(1);
    });
  });

  describe('distance absente', () => {
    it('compte la séance et sa durée sans ajouter de distance', () => {
      const stats = calculator.compute(
        range('2026-05-13T00:00:00.000Z', '2026-05-13T00:00:00.000Z', 'week'),
        [
          fact('strength', '2026-05-12T06:00:00.000Z', {
            durationSeconds: 2400,
            distanceMeters: null,
          }),
        ],
        null,
      );

      expect(stats[0]?.totals).toMatchObject({
        count: 1,
        durationSeconds: 2400,
        distanceMeters: 0,
      });
    });
  });

  describe('ordre des périodes', () => {
    it('renvoie une période par semaine de la plage, en ordre chronologique', () => {
      const stats = calculator.compute(
        range('2026-05-13T00:00:00.000Z', '2026-05-27T00:00:00.000Z', 'week'),
        [],
        null,
      );

      expect(stats.map((period) => period.period.start.toISOString())).toEqual([
        '2026-05-11T00:00:00.000Z',
        '2026-05-18T00:00:00.000Z',
        '2026-05-25T00:00:00.000Z',
      ]);
    });
  });
});
