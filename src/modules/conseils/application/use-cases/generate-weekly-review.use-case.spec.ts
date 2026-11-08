import { WeeklyReviewInvalidWeekError } from '../../domain/errors/weekly-review-invalid-week.error.js';
import { WeeklyReviewInvalidOutputError } from '../../domain/errors/weekly-review-invalid-output.error.js';
import type {
  IWeeklyDataReader,
  WeeklyDataReference,
} from '../../domain/ports/outbound/weekly-review.ports.js';
import { WeeklyReview } from '../../domain/value-objects/weekly-review.vo.js';
import {
  GENERIC_WEEKLY_REVIEW,
  GenerateWeeklyReviewUseCase,
} from './generate-weekly-review.use-case.js';

const NOW = new Date('2026-11-09T10:00:00.000Z');

const WITH_PLANNED: WeeklyDataReference = {
  planned: [
    {
      date: '2026-11-02',
      disciplineTypeKey: 'running',
      durationMinutes: 45,
      status: 'realisee',
    },
  ],
  current: { count: 2, durationSeconds: 5400, distanceMeters: 16000 },
  previous: { count: 1, durationSeconds: 2700, distanceMeters: 8000 },
};

const WITHOUT_PLANNED: WeeklyDataReference = {
  planned: [],
  current: { count: 1, durationSeconds: 2700, distanceMeters: 8000 },
  previous: { count: 0, durationSeconds: 0, distanceMeters: 0 },
};

const AI_REPLY = {
  suivi: 'Séance réalisée.',
  pointAttention: 'Allure à surveiller.',
  conseil: 'Repos actif mercredi.',
  model: 'claude-sonnet-5-5',
};

function setup(data: WeeklyDataReference) {
  const reader: IWeeklyDataReader = {
    readWeek: vi.fn().mockResolvedValue(data),
  };
  const generator = { generate: vi.fn().mockResolvedValue(AI_REPLY) };
  const reviews = {
    findByWeek: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const useCase = new GenerateWeeklyReviewUseCase(
    reader,
    generator,
    reviews,
    () => NOW,
  );
  return { reader, generator, reviews, useCase };
}

describe('GenerateWeeklyReviewUseCase', () => {
  it('appelle le modèle une fois et stocke les trois parties du bilan', async () => {
    const { generator, reviews, useCase } = setup(WITH_PLANNED);

    const dto = await useCase.execute('2026-W45');

    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(generator.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        week: '2026-W45',
        planned: WITH_PLANNED.planned,
      }),
    );
    expect(reviews.save).toHaveBeenCalledWith(
      expect.objectContaining({ week: '2026-W45', source: 'ia' }),
    );
    expect(dto).toMatchObject({
      week: '2026-W45',
      suivi: 'Séance réalisée.',
      pointAttention: 'Allure à surveiller.',
      conseil: 'Repos actif mercredi.',
      source: 'ia',
      model: 'claude-sonnet-5-5',
      generatedAt: NOW,
    });
  });

  it('stocke un bilan générique sans appel au modèle si aucune séance n’est prévue', async () => {
    const { generator, reviews, useCase } = setup(WITHOUT_PLANNED);

    const dto = await useCase.execute('2026-W45');

    expect(generator.generate).not.toHaveBeenCalled();
    expect(reviews.save).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'generique', model: null }),
    );
    expect(dto).toMatchObject({
      suivi: GENERIC_WEEKLY_REVIEW.suivi,
      pointAttention: GENERIC_WEEKLY_REVIEW.pointAttention,
      conseil: GENERIC_WEEKLY_REVIEW.conseil,
    });
  });

  it('ne stocke rien si le modèle renvoie une partie vide', async () => {
    const { generator, reviews, useCase } = setup(WITH_PLANNED);
    generator.generate.mockResolvedValueOnce({ ...AI_REPLY, suivi: ' ' });

    await expect(useCase.execute('2026-W45')).rejects.toBeInstanceOf(
      WeeklyReviewInvalidOutputError,
    );
    expect(reviews.save).not.toHaveBeenCalled();
  });

  it('rejette une semaine invalide sans lecture ni appel', async () => {
    const { reader, generator, reviews, useCase } = setup(WITH_PLANNED);

    await expect(useCase.execute('2026-W99')).rejects.toBeInstanceOf(
      WeeklyReviewInvalidWeekError,
    );
    expect(reader.readWeek).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
    expect(reviews.save).not.toHaveBeenCalled();
  });

  it('stocke une instance de WeeklyReview', async () => {
    const { reviews, useCase } = setup(WITHOUT_PLANNED);

    await useCase.execute('2026-W45');

    expect(reviews.save.mock.calls[0]?.[0]).toBeInstanceOf(WeeklyReview);
  });
});
