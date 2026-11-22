import { StatsPeriod } from './stats-period.vo.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('StatsPeriod', () => {
  describe('semaine ISO', () => {
    it('rattache un dimanche 23:59:59.999 à la semaine qui se termine ce jour-là', () => {
      const period = StatsPeriod.containing(
        new Date('2026-11-01T23:59:59.999Z'),
        'week',
      );

      expect(period.start).toEqual(new Date('2026-10-26T00:00:00.000Z'));
      expect(period.end).toEqual(new Date('2026-11-02T00:00:00.000Z'));
    });

    it('ouvre une nouvelle semaine à un lundi 00:00:00.000', () => {
      const sunday = StatsPeriod.containing(
        new Date('2026-11-01T23:59:59.999Z'),
        'week',
      );
      const monday = StatsPeriod.containing(
        new Date('2026-11-02T00:00:00.000Z'),
        'week',
      );

      expect(monday.start).toEqual(new Date('2026-11-02T00:00:00.000Z'));
      expect(monday.equals(sunday)).toBe(false);
    });

    it('garde dans la même semaine le 30 septembre et le 1er octobre', () => {
      const september = StatsPeriod.containing(
        new Date('2026-09-30T12:00:00.000Z'),
        'week',
      );
      const october = StatsPeriod.containing(
        new Date('2026-10-01T00:00:00.000Z'),
        'week',
      );

      expect(september.start).toEqual(new Date('2026-09-28T00:00:00.000Z'));
      expect(october.equals(september)).toBe(true);
    });

    it('situe le 1er janvier 2026 dans la semaine 1 de 2026, commencée le 29 décembre 2025', () => {
      const period = StatsPeriod.containing(
        new Date('2026-01-01T00:00:00.000Z'),
        'week',
      );

      expect(period.start).toEqual(new Date('2025-12-29T00:00:00.000Z'));
      expect(period.end).toEqual(new Date('2026-01-05T00:00:00.000Z'));
    });

    it('situe le 1er janvier 2027 dans la semaine 53 de 2026', () => {
      const period = StatsPeriod.containing(
        new Date('2027-01-01T00:00:00.000Z'),
        'week',
      );

      expect(period.start).toEqual(new Date('2026-12-28T00:00:00.000Z'));
    });

    it('précède la semaine 1 de 2026 par la dernière semaine de 2025', () => {
      const firstWeek = StatsPeriod.containing(
        new Date('2026-01-01T00:00:00.000Z'),
        'week',
      );

      expect(firstWeek.previous().start).toEqual(
        new Date('2025-12-22T00:00:00.000Z'),
      );
    });

    it('suit une semaine par la semaine commençant le lundi suivant', () => {
      const period = StatsPeriod.containing(
        new Date('2026-01-01T00:00:00.000Z'),
        'week',
      );

      expect(period.next().start).toEqual(new Date('2026-01-05T00:00:00.000Z'));
    });

    it('a une clé identique pour deux instants de la même semaine', () => {
      const monday = StatsPeriod.containing(
        new Date('2026-05-11T00:00:00.000Z'),
        'week',
      );
      const sunday = StatsPeriod.containing(
        new Date('2026-05-17T23:59:59.999Z'),
        'week',
      );

      expect(sunday.key).toBe(monday.key);
    });

    it('a une clé différente d’une semaine à l’autre', () => {
      const current = StatsPeriod.containing(
        new Date('2026-05-11T00:00:00.000Z'),
        'week',
      );
      const next = StatsPeriod.containing(
        new Date('2026-05-18T00:00:00.000Z'),
        'week',
      );

      expect(next.key).not.toBe(current.key);
    });
  });

  describe('mois calendaire UTC', () => {
    it('rattache le 31 janvier à 23:59:59.999 au mois de janvier', () => {
      const period = StatsPeriod.containing(
        new Date('2026-01-31T23:59:59.999Z'),
        'month',
      );

      expect(period.start).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(period.end).toEqual(new Date('2026-02-01T00:00:00.000Z'));
    });

    it('ouvre février à 00:00:00.000 le 1er', () => {
      const january = StatsPeriod.containing(
        new Date('2026-01-31T23:59:59.999Z'),
        'month',
      );
      const february = StatsPeriod.containing(
        new Date('2026-02-01T00:00:00.000Z'),
        'month',
      );

      expect(february.start).toEqual(new Date('2026-02-01T00:00:00.000Z'));
      expect(february.equals(january)).toBe(false);
    });

    it('précède janvier par décembre de l’année précédente', () => {
      const period = StatsPeriod.containing(
        new Date('2026-01-15T00:00:00.000Z'),
        'month',
      );

      expect(period.previous().start).toEqual(
        new Date('2025-12-01T00:00:00.000Z'),
      );
      expect(period.previous().end).toEqual(
        new Date('2026-01-01T00:00:00.000Z'),
      );
    });

    it('suit décembre par janvier de l’année suivante', () => {
      const period = StatsPeriod.containing(
        new Date('2025-12-15T00:00:00.000Z'),
        'month',
      );

      expect(period.next().start).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });

    it('compte 29 jours pour février 2028, année bissextile', () => {
      const period = StatsPeriod.containing(
        new Date('2028-02-10T00:00:00.000Z'),
        'month',
      );

      expect(period.end.getTime() - period.start.getTime()).toBe(29 * DAY_MS);
    });

    it('compte 28 jours pour février 2027', () => {
      const period = StatsPeriod.containing(
        new Date('2027-02-10T00:00:00.000Z'),
        'month',
      );

      expect(period.end.getTime() - period.start.getTime()).toBe(28 * DAY_MS);
    });
  });

  describe('appartenance', () => {
    it('contient ses instants jusqu’à la dernière milliseconde, sans la borne de fin', () => {
      const period = StatsPeriod.containing(
        new Date('2026-01-15T00:00:00.000Z'),
        'month',
      );

      expect(period.contains(new Date('2026-01-01T00:00:00.000Z'))).toBe(true);
      expect(period.contains(new Date('2026-01-31T23:59:59.999Z'))).toBe(true);
      expect(period.contains(new Date('2026-02-01T00:00:00.000Z'))).toBe(false);
    });
  });
});
