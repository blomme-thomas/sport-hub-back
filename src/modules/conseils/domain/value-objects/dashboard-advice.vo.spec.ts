import { DashboardAdviceInvalidOutputError } from '../errors/dashboard-advice-invalid-output.error.js';
import { DashboardAdvice } from './dashboard-advice.vo.js';

const base = {
  week: '2026-W45',
  source: 'ia' as const,
  model: 'claude-sonnet-5-5',
  generatedAt: new Date('2026-11-08T12:00:00.000Z'),
  sourceSummary: {},
};

describe('DashboardAdvice', () => {
  it('accepte un texte de 1 à 1000 caractères et le normalise', () => {
    expect(
      DashboardAdvice.create({ ...base, text: '  Bon conseil.  ' }).text,
    ).toBe('Bon conseil.');
  });

  it('refuse un texte vide', () => {
    expect(() => DashboardAdvice.create({ ...base, text: '   ' })).toThrow(
      DashboardAdviceInvalidOutputError,
    );
  });

  it('refuse un texte de plus de 1000 caractères', () => {
    expect(() =>
      DashboardAdvice.create({ ...base, text: 'a'.repeat(1001) }),
    ).toThrow(DashboardAdviceInvalidOutputError);
  });
});
