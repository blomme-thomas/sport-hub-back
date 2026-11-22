import { WeeklyReviewInvalidWeekError } from '../../domain/errors/weekly-review-invalid-week.error.js';
import { WeeklyReviewNotFoundError } from '../../domain/errors/weekly-review-not-found.error.js';
import type { IWeeklyReviewRepository } from '../../domain/ports/outbound/weekly-review.ports.js';
import { WeeklyReview } from '../../domain/value-objects/weekly-review.vo.js';
import { GetWeeklyReviewUseCase } from './get-weekly-review.use-case.js';

function repositoryReturning(stored: WeeklyReview | null) {
  return {
    findByWeek: vi.fn().mockResolvedValue(stored),
    save: vi.fn(),
  } satisfies IWeeklyReviewRepository & Record<string, unknown>;
}

const STORED = WeeklyReview.create({
  week: '2026-W45',
  suivi: 'Trois séances sur trois réalisées.',
  pointAttention: 'Volume en hausse.',
  conseil: 'Garder une séance facile.',
  source: 'ia',
  model: 'claude-sonnet-5-5',
  generatedAt: new Date('2026-11-09T10:00:00.000Z'),
});

describe('GetWeeklyReviewUseCase', () => {
  it('renvoie le bilan stocké sans appel au modèle', async () => {
    const reviews = repositoryReturning(STORED);

    const dto = await new GetWeeklyReviewUseCase(reviews).execute('2026-W45');

    expect(reviews.findByWeek).toHaveBeenCalledWith('2026-W45');
    expect(dto.conseil).toBe('Garder une séance facile.');
    expect(dto.source).toBe('ia');
  });

  it('lève WeeklyReviewNotFoundError si aucun bilan n’est stocké', async () => {
    const useCase = new GetWeeklyReviewUseCase(repositoryReturning(null));

    await expect(useCase.execute('2026-W45')).rejects.toBeInstanceOf(
      WeeklyReviewNotFoundError,
    );
  });

  it('rejette une semaine invalide avant la lecture', async () => {
    const reviews = repositoryReturning(null);
    const useCase = new GetWeeklyReviewUseCase(reviews);

    await expect(useCase.execute('2025-W53')).rejects.toBeInstanceOf(
      WeeklyReviewInvalidWeekError,
    );
    expect(reviews.findByWeek).not.toHaveBeenCalled();
  });
});
