import { describe, expect, it } from 'vitest';
import { parseExportMonth } from './export-month.vo.js';

describe('parseExportMonth', () => {
  it('renvoie le premier et le dernier jour du mois', () => {
    const month = parseExportMonth('2026-02');

    expect(month?.first.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(month?.last.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('accepte une année bissextile', () => {
    expect(parseExportMonth('2028-02')?.last.toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });

  it.each([
    '2026-13',
    '2026-00',
    '2026-1',
    '2026-W46',
    '26-11',
    'nov-2026',
    '',
  ])('rejette %s', (value) => {
    expect(parseExportMonth(value)).toBeNull();
  });
});
