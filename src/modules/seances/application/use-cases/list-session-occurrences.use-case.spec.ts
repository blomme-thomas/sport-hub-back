import { describe, expect, it } from 'vitest';
import { Session } from '../../domain/entities/session.entity.js';
import { InvalidSessionError } from '../../domain/errors/invalid-session.error.js';
import type {
  ISessionRepository,
  SessionPeriod,
} from '../../domain/ports/outbound/session.repository.port.js';
import type { SessionId } from '../../domain/value-objects/session-id.vo.js';
import { ListSessionOccurrencesUseCase } from './list-session-occurrences.use-case.js';

const BASE = {
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
};

class FakeSessionRepository implements ISessionRepository {
  periods: SessionPeriod[] = [];

  constructor(private readonly sessions: Session[]) {}

  async findOccurrenceCandidates(period: SessionPeriod): Promise<Session[]> {
    this.periods.push(period);
    return this.sessions;
  }

  async findById(_id: SessionId): Promise<Session | null> {
    return null;
  }
  async findByPeriod(): Promise<Session[]> {
    return [];
  }
  async findByActivityIds(): Promise<Session[]> {
    return [];
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

describe('ListSessionOccurrencesUseCase', () => {
  it('renvoie les occurrences de toutes les séances, triées par date, heure puis identifiant', async () => {
    const weekly = Session.create({
      ...BASE,
      date: new Date('2026-11-02T00:00:00.000Z'),
      startTime: '18:00',
      recurrence: 'hebdomadaire',
    });
    const single = Session.create({
      ...BASE,
      date: new Date('2026-11-09T00:00:00.000Z'),
      startTime: '07:00',
    });
    const useCase = new ListSessionOccurrencesUseCase(
      new FakeSessionRepository([weekly, single]),
    );

    const occurrences = await useCase.execute({
      from: '2026-11-01',
      to: '2026-11-10',
    });

    expect(
      occurrences.map((occurrence) => [occurrence.date, occurrence.startTime]),
    ).toEqual([
      ['2026-11-02', '18:00'],
      ['2026-11-09', '07:00'],
      ['2026-11-09', '18:00'],
    ]);
  });

  it('demande au repository les candidats de la période, séries hebdomadaires comprises', async () => {
    const repository = new FakeSessionRepository([]);
    const useCase = new ListSessionOccurrencesUseCase(repository);

    await useCase.execute({ from: '2026-11-01', to: '2026-11-30' });

    expect(repository.periods).toEqual([
      {
        from: new Date('2026-11-01T00:00:00.000Z'),
        to: new Date('2026-11-30T00:00:00.000Z'),
      },
    ]);
  });

  it('refuse une période qui se termine avant son début', async () => {
    const useCase = new ListSessionOccurrencesUseCase(
      new FakeSessionRepository([]),
    );

    await expect(
      useCase.execute({ from: '2026-11-10', to: '2026-11-01' }),
    ).rejects.toThrow(InvalidSessionError);
  });

  it('refuse une période de plus de 366 jours', async () => {
    const useCase = new ListSessionOccurrencesUseCase(
      new FakeSessionRepository([]),
    );

    await expect(
      useCase.execute({ from: '2026-01-01', to: '2027-01-03' }),
    ).rejects.toThrow(InvalidSessionError);
  });
});
