import { DashboardAdviceNotFoundError } from '../../domain/errors/dashboard-advice-not-found.error.js';
import type { IDashboardAdviceRepository } from '../../domain/ports/outbound/dashboard-advice.ports.js';
import { DashboardAdvice } from '../../domain/value-objects/dashboard-advice.vo.js';
import { GetDashboardAdviceUseCase } from './get-dashboard-advice.use-case.js';

const NOW = new Date('2026-11-08T12:00:00.000Z');

function repositoryWith(
  advice: DashboardAdvice | null,
): IDashboardAdviceRepository {
  return {
    findByWeek: vi.fn((week: string) =>
      Promise.resolve(advice?.week === week ? advice : null),
    ),
    save: vi.fn(() => Promise.resolve()),
  };
}

describe('GetDashboardAdviceUseCase', () => {
  it('renvoie le conseil stocké de la semaine courante', async () => {
    const advice = DashboardAdvice.create({
      week: '2026-W45',
      text: 'Garde la séance de jeudi facile.',
      source: 'ia',
      model: 'claude-sonnet-5-5',
      generatedAt: NOW,
      sourceSummary: {},
    });
    const repository = repositoryWith(advice);

    const dto = await new GetDashboardAdviceUseCase(
      repository,
      () => NOW,
    ).execute();

    expect(dto.text).toBe('Garde la séance de jeudi facile.');
    expect(repository.findByWeek).toHaveBeenCalledWith('2026-W45');
  });

  it("lève DashboardAdviceNotFoundError si aucun conseil n'existe pour la semaine", async () => {
    const useCase = new GetDashboardAdviceUseCase(
      repositoryWith(null),
      () => NOW,
    );

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      DashboardAdviceNotFoundError,
    );
  });
});
