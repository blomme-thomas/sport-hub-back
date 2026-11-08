import type {
  DashboardAdviceData,
  IDashboardAdviceDataReader,
  IDashboardAdviceGenerator,
  IDashboardAdviceRepository,
} from '../../domain/ports/outbound/dashboard-advice.ports.js';
import type { DashboardAdvice } from '../../domain/value-objects/dashboard-advice.vo.js';
import {
  GenerateDashboardAdviceUseCase,
  INSUFFICIENT_DASHBOARD_ADVICE_TEXT,
} from './generate-dashboard-advice.use-case.js';

const NOW = new Date('2026-11-08T12:00:00.000Z');

function data(count: number): DashboardAdviceData {
  return {
    week: '2026-W45',
    stats: {
      count,
      durationSeconds: count * 3600,
      calories: null,
      elevationGainMeters: null,
      averageHeartRate: null,
      hrTimeInZoneSeconds: [null, null, null, null, null],
      bySport: [],
      variationDirection: 'unknown',
      variationPercent: null,
    },
    recovery: [],
    zones: {
      available: false,
      trainingMethod: null,
      maxHeartRateUsed: null,
      restingHeartRateUsed: null,
      zoneFloors: [null, null, null, null, null],
    },
  };
}

class FakeReader implements IDashboardAdviceDataReader {
  constructor(private readonly count: number) {}
  readWeek = vi.fn(() => Promise.resolve(data(this.count)));
}

class FakeGenerator implements IDashboardAdviceGenerator {
  generate = vi.fn(() =>
    Promise.resolve({
      text: 'Belle semaine, garde la séance facile.',
      model: 'claude-sonnet-5-5',
    }),
  );
}

class FakeRepository implements IDashboardAdviceRepository {
  saved: DashboardAdvice[] = [];
  findByWeek = vi.fn();
  save(advice: DashboardAdvice): Promise<void> {
    this.saved.push(advice);
    return Promise.resolve();
  }
}

describe('GenerateDashboardAdviceUseCase', () => {
  function useCase(count: number) {
    const reader = new FakeReader(count);
    const generator = new FakeGenerator();
    const repository = new FakeRepository();
    const instance = new GenerateDashboardAdviceUseCase(
      reader,
      generator,
      repository,
      () => NOW,
    );
    return { instance, reader, generator, repository };
  }

  it('génère le conseil de la semaine ISO courante et le stocke avec la source ia', async () => {
    const { instance, generator, repository } = useCase(3);

    const dto = await instance.execute();

    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(dto).toMatchObject({
      week: '2026-W45',
      source: 'ia',
      model: 'claude-sonnet-5-5',
      generatedAt: NOW,
    });
    expect(repository.saved).toHaveLength(1);
  });

  it('sans activité dans la semaine, stocke le conseil « données insuffisantes » sans appel au modèle', async () => {
    const { instance, generator, repository } = useCase(0);

    const dto = await instance.execute();

    expect(generator.generate).not.toHaveBeenCalled();
    expect(dto).toMatchObject({
      week: '2026-W45',
      text: INSUFFICIENT_DASHBOARD_ADVICE_TEXT,
      source: 'insuffisant',
      model: null,
    });
    expect(repository.saved).toHaveLength(1);
  });

  it('transmet au modèle les données de la semaine, sans identité ni clé', async () => {
    const { instance, generator } = useCase(2);

    await instance.execute();

    const sent = JSON.stringify(generator.generate.mock.calls[0]?.[0]);
    expect(sent).not.toMatch(/displayName|token|api[_-]?key/i);
  });
});
