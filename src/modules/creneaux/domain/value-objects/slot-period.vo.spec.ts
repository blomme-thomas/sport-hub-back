import { InvalidSlotPeriodError } from '../errors/invalid-slot-period.error.js';
import { SlotPeriodTooLargeError } from '../errors/slot-period-too-large.error.js';
import { SlotPeriod } from './slot-period.vo.js';

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('SlotPeriod', () => {
  describe('validation', () => {
    it('accepte une période d’un seul jour quand from est égal à to', () => {
      const period = SlotPeriod.create({
        from: day('2026-05-04'),
        to: day('2026-05-04'),
      });

      expect(period.days()).toBe(1);
    });

    it('refuse une période dont to précède from avec SLOT_PERIOD_INVALID', () => {
      const error = captureError(() =>
        SlotPeriod.create({ from: day('2026-05-05'), to: day('2026-05-04') }),
      );

      expect(error).toBeInstanceOf(InvalidSlotPeriodError);
      expect(error).toMatchObject({ code: 'SLOT_PERIOD_INVALID' });
    });

    it('accepte 366 jours inclusifs, du 1er janvier 2026 au 1er janvier 2027', () => {
      const period = SlotPeriod.create({
        from: day('2026-01-01'),
        to: day('2027-01-01'),
      });

      expect(period.days()).toBe(366);
    });

    it('refuse 367 jours inclusifs avec SLOT_PERIOD_TOO_LARGE', () => {
      const error = captureError(() =>
        SlotPeriod.create({
          from: day('2026-01-01'),
          to: day('2027-01-02'),
        }),
      );

      expect(error).toBeInstanceOf(SlotPeriodTooLargeError);
      expect(error).toMatchObject({ code: 'SLOT_PERIOD_TOO_LARGE' });
    });
  });

  describe('jours couverts', () => {
    it('compte les deux bornes dans le nombre de jours', () => {
      const period = SlotPeriod.create({
        from: day('2026-05-01'),
        to: day('2026-05-07'),
      });

      expect(period.days()).toBe(7);
    });
  });

  describe('appartenance d’une date', () => {
    const period = SlotPeriod.create({
      from: day('2026-05-01'),
      to: day('2026-05-31'),
    });

    it('contient la date de début', () => {
      expect(period.contains(day('2026-05-01'))).toBe(true);
    });

    it('contient la date de fin', () => {
      expect(period.contains(day('2026-05-31'))).toBe(true);
    });

    it('ne contient pas la veille de la date de début', () => {
      expect(period.contains(day('2026-04-30'))).toBe(false);
    });

    it('ne contient pas le lendemain de la date de fin', () => {
      expect(period.contains(day('2026-06-01'))).toBe(false);
    });
  });
});
