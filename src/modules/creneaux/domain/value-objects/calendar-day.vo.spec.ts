import { InvalidSlotError } from '../errors/invalid-slot.error.js';
import { CalendarDay } from './calendar-day.vo.js';

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('CalendarDay', () => {
  describe('lecture au format YYYY-MM-DD', () => {
    it('restitue le jour à minuit UTC', () => {
      expect(CalendarDay.parse('2026-05-04').toDate().toISOString()).toBe(
        '2026-05-04T00:00:00.000Z',
      );
    });

    it('restitue le texte d’origine', () => {
      expect(CalendarDay.parse('2028-02-29').toString()).toBe('2028-02-29');
    });

    it('reconstitue le jour depuis une date à minuit UTC', () => {
      expect(
        CalendarDay.fromDate(new Date('2026-12-31T00:00:00.000Z')).toString(),
      ).toBe('2026-12-31');
    });
  });

  describe('refus des dates mal formées', () => {
    it.each([
      ['format français', '04/05/2026'],
      ['jour sans zéro de tête', '2026-5-4'],
      ['29 février d’une année non bissextile', '2027-02-29'],
      ['jour inexistant', '2026-02-30'],
      ['chaîne vide', ''],
      ['date avec heure', '2026-05-04T10:00:00.000Z'],
    ])('refuse %s (%s) avec SLOT_INVALID', (_label, text) => {
      expect(captureError(() => CalendarDay.parse(text))).toBeInstanceOf(
        InvalidSlotError,
      );
      expect(captureError(() => CalendarDay.parse(text))).toMatchObject({
        code: 'SLOT_INVALID',
      });
    });
  });
});
