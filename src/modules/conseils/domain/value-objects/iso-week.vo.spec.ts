import { WeeklyReviewInvalidWeekError } from '../errors/weekly-review-invalid-week.error.js';
import { IsoWeek } from './iso-week.vo.js';

describe('IsoWeek', () => {
  it('calcule le lundi et le dimanche de la semaine', () => {
    const week = IsoWeek.parse('2026-W45');

    expect(week.label).toBe('2026-W45');
    expect(week.monday.toISOString()).toBe('2026-11-02T00:00:00.000Z');
    expect(week.sunday.toISOString()).toBe('2026-11-08T00:00:00.000Z');
    expect(week.previousMonday.toISOString()).toBe('2026-10-26T00:00:00.000Z');
  });

  it('place la semaine 1 contenant le 4 janvier', () => {
    const week = IsoWeek.parse('2025-W01');

    expect(week.monday.toISOString()).toBe('2024-12-30T00:00:00.000Z');
  });

  it('accepte la semaine 53 des années qui en comptent 53', () => {
    const week = IsoWeek.parse('2026-W53');

    expect(week.monday.toISOString()).toBe('2026-12-28T00:00:00.000Z');
  });

  it('rejette la semaine 53 d’une année qui n’en compte que 52', () => {
    expect(() => IsoWeek.parse('2025-W53')).toThrow(
      WeeklyReviewInvalidWeekError,
    );
  });

  it.each(['2026-W00', '2026-W54', '2026-45', '26-W45', '2026-W4', 'semaine'])(
    'rejette le format invalide %s',
    (value) => {
      expect(() => IsoWeek.parse(value)).toThrow(WeeklyReviewInvalidWeekError);
    },
  );
});
