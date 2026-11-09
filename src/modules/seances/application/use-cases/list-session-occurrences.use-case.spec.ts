import { describe, expect, it } from 'vitest';
import type { SessionOccurrenceException } from '../../domain/entities/session-occurrence-exception.js';
import { Session } from '../../domain/entities/session.entity.js';
import { InvalidSessionError } from '../../domain/errors/invalid-session.error.js';
import type { ISessionOccurrenceExceptionRepository } from '../../domain/ports/outbound/session-occurrence-exception.repository.port.js';
import type {
  ISessionRepository,
  SessionPeriod,
} from '../../domain/ports/outbound/session.repository.port.js';
import { ListSessionOccurrencesUseCase } from './list-session-occurrences.use-case.js';

const BASE = {
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
};

class FakeSessionRepository {
  periods: SessionPeriod[] = [];

  constructor(private readonly sessions: Session[]) {}

  async findOccurrenceCandidates(period: SessionPeriod): Promise<Session[]> {
    this.periods.push(period);
    return this.sessions;
  }
}

class FakeExceptionRepository {
  constructor(private readonly rows: SessionOccurrenceException[] = []) {}

  async findBySessionIds(): Promise<SessionOccurrenceException[]> {
    return this.rows;
  }
}

function useCase(
  sessions: Session[],
  exceptions: SessionOccurrenceException[] = [],
) {
  return new ListSessionOccurrencesUseCase(
    new FakeSessionRepository(sessions) as unknown as ISessionRepository,
    new FakeExceptionRepository(
      exceptions,
    ) as unknown as ISessionOccurrenceExceptionRepository,
  );
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

    const occurrences = await useCase([weekly, single]).execute({
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

    await new ListSessionOccurrencesUseCase(
      repository as unknown as ISessionRepository,
      new FakeExceptionRepository() as unknown as ISessionOccurrenceExceptionRepository,
    ).execute({ from: '2026-11-01', to: '2026-11-30' });

    expect(repository.periods).toEqual([
      {
        from: new Date('2026-11-01T00:00:00.000Z'),
        to: new Date('2026-11-30T00:00:00.000Z'),
      },
    ]);
  });

  it('refuse une période qui se termine avant son début', async () => {
    await expect(
      useCase([]).execute({ from: '2026-11-10', to: '2026-11-01' }),
    ).rejects.toThrow(InvalidSessionError);
  });

  it('refuse une période de plus de 366 jours', async () => {
    await expect(
      useCase([]).execute({ from: '2026-01-01', to: '2027-01-03' }),
    ).rejects.toThrow(InvalidSessionError);
  });

  it('affiche une occurrence déplacée à sa nouvelle date et une occurrence annulée avec son statut', async () => {
    const weekly = Session.create({
      ...BASE,
      date: new Date('2026-11-02T00:00:00.000Z'),
      startTime: '18:00',
      recurrence: 'hebdomadaire',
    });
    const id = weekly.id.toString();

    const occurrences = await useCase(
      [weekly],
      [
        {
          sessionId: id,
          occurrenceDate: new Date('2026-11-09T00:00:00.000Z'),
          movedDate: new Date('2026-11-10T00:00:00.000Z'),
          movedStartTime: '07:00',
          cancelled: false,
        },
        {
          sessionId: id,
          occurrenceDate: new Date('2026-11-16T00:00:00.000Z'),
          movedDate: null,
          movedStartTime: null,
          cancelled: true,
        },
      ],
    ).execute({ from: '2026-11-08', to: '2026-11-17' });

    expect(occurrences.map((o) => [o.date, o.startTime, o.status])).toEqual([
      ['2026-11-10', '07:00', 'planifiee'],
      ['2026-11-16', '18:00', 'annulee'],
    ]);
  });

  it('fait apparaître une occurrence déplacée depuis hors de la période', async () => {
    const single = Session.create({
      ...BASE,
      date: new Date('2026-10-20T00:00:00.000Z'),
      startTime: '18:00',
    });

    const occurrences = await useCase(
      [single],
      [
        {
          sessionId: single.id.toString(),
          occurrenceDate: new Date('2026-10-20T00:00:00.000Z'),
          movedDate: new Date('2026-11-03T00:00:00.000Z'),
          movedStartTime: null,
          cancelled: false,
        },
      ],
    ).execute({ from: '2026-11-01', to: '2026-11-30' });

    expect(occurrences.map((o) => o.date)).toEqual(['2026-11-03']);
  });
});
